import { z } from "@/lib/validation";
import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { verifyExpoToken } from "@/lib/expo-token";
import { isExpoEnabled, recordExpoSignup } from "@/lib/expo-state";
import { isValidIndonesianPhone } from "@/lib/phone";
import { log } from "@/lib/logger";

// Allow a slightly larger JSON body so a compressed (~150 KB) logo can ride
// along as a base64 data URL. Everything else is tiny.
export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

// Defaults for fields the one-screen expo form intentionally skips — the vendor
// polishes these later from the dashboard.
const DEFAULT_CITY = "Surabaya";
const DEFAULT_CATEGORY = "Lainnya";
const DEFAULT_SALES_SYSTEM = "ready-stock";
const DEFAULT_DELIVERY = "COD Kampus";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

const LOGO_RE = /^data:image\/(png|jpe?g|webp);base64,/;

const signupSchema = z.object({
  t: z.string().min(1),
  businessName: z.string().trim().min(2, "Nama bisnis minimal 2 karakter").max(120, "Nama bisnis terlalu panjang"),
  email: z.string().trim().email("Email tidak valid").max(200),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(200),
  whatsapp: z.string().trim().refine(isValidIndonesianPhone, "Nomor WhatsApp tidak valid (contoh: 0812xxxxxxx)"),
  description: z.string().trim().min(10, "Deskripsi minimal 10 karakter").max(150, "Deskripsi maksimal 150 karakter"),
  logoDataUrl: z.string().regex(LOGO_RE, "Format logo tidak didukung").optional().nullable(),
});

export default createHandler({
  POST: method({
    auth: "none",
    rateLimit: { limit: 20, windowMs: 10 * 60_000, key: "expo-signup" },
    body: signupSchema,
    handler: async ({ body, res }) => {
      // 1. Gate: the in-person vouch is encoded in a short-lived signed token,
      //    plus the admin kill-switch. Both must pass.
      const verdict = verifyExpoToken(body.t);
      if (!verdict.ok) {
        const msg = verdict.reason === "expired"
          ? "QR sudah kedaluwarsa. Minta panitia menampilkan ulang QR-nya."
          : "QR tidak valid. Minta panitia menampilkan ulang QR-nya.";
        return res.status(403).json({ error: msg });
      }
      if (!(await isExpoEnabled())) {
        return res.status(403).json({ error: "Pendaftaran lewat QR sedang ditutup." });
      }

      const service = getSupabaseServiceClient();
      if (!service) return sendServiceUnavailable(res);

      const { businessName, email, password, whatsapp, description } = body;

      // 2. Create the account already email-confirmed (no inbox round-trip).
      const { data: created, error: createErr } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: businessName, phone: whatsapp },
      });
      if (createErr || !created.user) {
        const already = /registered|already|exists/i.test(createErr?.message ?? "");
        if (already) {
          return res.status(409).json({ error: "Email sudah terdaftar. Silakan masuk lewat halaman login." });
        }
        return sendInternalServerError(res, "Gagal membuat akun", createErr);
      }
      const userId = created.user.id;

      // From here on, any failure should roll the orphan auth user back so the
      // person can cleanly retry instead of being stuck half-registered.
      const rollback = async (reason: string, cause?: unknown) => {
        log.warn("expo_signup_rollback", { userId, reason, ...(cause ? { cause: String(cause) } : {}) });
        await service.auth.admin.deleteUser(userId).catch(() => {});
      };

      // 3. Optional logo → public vendor-assets bucket via service role (the user
      //    has no session yet, so the server does the upload).
      let logoUrl: string | null = null;
      if (body.logoDataUrl) {
        const match = body.logoDataUrl.match(LOGO_RE);
        const ext = match?.[1]?.startsWith("jp") ? "jpg" : (match?.[1] ?? "jpg");
        const base64 = body.logoDataUrl.slice(body.logoDataUrl.indexOf(",") + 1);
        const buffer = Buffer.from(base64, "base64");
        const path = `${userId}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await service.storage
          .from("vendor-assets")
          .upload(path, buffer, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: true });
        if (upErr) {
          // Logo is non-essential — log and continue without it rather than
          // failing the whole signup at a busy booth.
          log.warn("expo_signup_logo_failed", { userId, message: upErr.message });
        } else {
          logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-assets/${path}`;
        }
      }

      // 4. Promote the auto-created profile (handle_new_user trigger already
      //    inserted it as 'customer') to vendor.
      const { error: profileErr } = await service
        .from("profiles")
        .update({ role: "vendor", full_name: businessName, phone: whatsapp, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (profileErr) {
        await rollback("profile_update_failed", profileErr.message);
        return sendInternalServerError(res, "Gagal menyimpan profil", profileErr);
      }

      // 5. Create the vendor — already verified (the QR is the in-person vouch).
      const slug = `${slugify(businessName)}-${userId.slice(0, 8)}`;
      const { data: vendor, error: vendorErr } = await service
        .from("vendors")
        .insert({
          owner_id: userId,
          slug,
          name: businessName,
          category: DEFAULT_CATEGORY,
          city: DEFAULT_CITY,
          description,
          whatsapp,
          logo_url: logoUrl,
          sales_system: DEFAULT_SALES_SYSTEM,
          delivery_methods: DEFAULT_DELIVERY,
          is_verified: true,
        })
        .select("id")
        .single();
      if (vendorErr || !vendor) {
        await rollback("vendor_insert_failed", vendorErr?.message);
        return sendInternalServerError(res, "Gagal membuat data vendor", vendorErr);
      }

      // 6. Audit trail for the admin's post-expo review (best-effort).
      await recordExpoSignup({ vendorId: vendor.id, vendorName: businessName, email, slug, ts: Date.now() });

      log.info("expo_signup", { userId, vendorId: vendor.id });
      return res.status(200).json({ ok: true, vendorId: vendor.id });
    },
  }),
});
