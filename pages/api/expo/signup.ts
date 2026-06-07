import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "@/lib/validation";
import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { verifyExpoToken } from "@/lib/expo-token";
import { isExpoEnabled, recordExpoSignup } from "@/lib/expo-state";
import { isValidIndonesianPhone } from "@/lib/phone";
import { log } from "@/lib/logger";

// Allow a slightly larger JSON body so two compressed images (logo + booth
// photo) can ride along as base64 data URLs. Everything else is tiny.
export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

// Canonical category list — must match VendorOnboardingWizard.tsx,
// TabEditProfile.tsx, and the explore filter chips.
const CATEGORY_OPTIONS = [
  "Makanan & Minuman",
  "Jasa & Layanan",
  "Fashion",
  "Kreatif & Desain",
  "Elektronik",
  "Kesehatan & Kecantikan",
  "Lainnya",
] as const;

// Fields the one-screen expo form intentionally skips — polished later from the
// dashboard. City is hardcoded since every expo vendor is in Surabaya.
const DEFAULT_CITY = "Surabaya";
const DEFAULT_SALES_SYSTEM = "ready-stock";
const DEFAULT_DELIVERY = "COD Kampus";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

const IMAGE_RE = /^data:image\/(png|jpe?g|webp);base64,/;

/** Decode a base64 data URL and upload it to the public vendor-assets bucket via
 *  the service role (the just-created user has no session yet). Best-effort:
 *  returns null and logs on failure rather than aborting the whole signup. */
async function uploadImage(
  service: SupabaseClient,
  userId: string,
  dataUrl: string,
  kind: "logo" | "booth",
): Promise<string | null> {
  const match = dataUrl.match(IMAGE_RE);
  if (!match) return null;
  const ext = match[1].startsWith("jp") ? "jpg" : match[1];
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const buffer = Buffer.from(base64, "base64");
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await service.storage
    .from("vendor-assets")
    .upload(path, buffer, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: true });
  if (error) {
    log.warn(`expo_signup_${kind}_failed`, { userId, message: error.message });
    return null;
  }
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-assets/${path}`;
}

const signupSchema = z.object({
  t: z.string().min(1),
  businessName: z.string().trim().min(2, "Nama bisnis minimal 2 karakter").max(120, "Nama bisnis terlalu panjang"),
  category: z.enum(CATEGORY_OPTIONS, { message: "Pilih kategori bisnis" }),
  email: z.string().trim().email("Email tidak valid").max(200),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(200),
  whatsapp: z.string().trim().refine(isValidIndonesianPhone, "Nomor WhatsApp tidak valid (contoh: 0812xxxxxxx)"),
  description: z.string().trim().min(10, "Deskripsi minimal 10 karakter").max(150, "Deskripsi maksimal 150 karakter"),
  logoDataUrl: z.string().regex(IMAGE_RE, "Format logo tidak didukung").optional().nullable(),
  boothDataUrl: z.string().regex(IMAGE_RE, "Format foto booth tidak didukung").optional().nullable(),
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

      const { businessName, category, email, password, whatsapp, description } = body;

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

      // 3. Optional images → public vendor-assets bucket. Logo → logo_url, booth
      //    photo → hero_image_url (the banner shown on the public profile).
      const logoUrl = body.logoDataUrl ? await uploadImage(service, userId, body.logoDataUrl, "logo") : null;
      const heroUrl = body.boothDataUrl ? await uploadImage(service, userId, body.boothDataUrl, "booth") : null;

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
          category,
          city: DEFAULT_CITY,
          description,
          whatsapp,
          logo_url: logoUrl,
          hero_image_url: heroUrl,
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

      // 6. Seed open hours for all 7 days so the vendor isn't shown as closed
      //    during the expo (the dashboard's fallback marks Sunday closed).
      //    Best-effort — the vendor can fine-tune from the dashboard.
      const defaultHours = Array.from({ length: 7 }, (_, day) => ({
        vendor_id: vendor.id,
        day_of_week: day,
        opens_at: "08:00",
        closes_at: "21:00",
        is_closed: false,
        notes: null,
      }));
      const { error: hoursErr } = await service
        .from("vendor_hours")
        .upsert(defaultHours, { onConflict: "vendor_id,day_of_week" });
      if (hoursErr) log.warn("expo_signup_hours_failed", { userId, vendorId: vendor.id, message: hoursErr.message });

      // 7. Audit trail for the admin's post-expo review (best-effort).
      await recordExpoSignup({ vendorId: vendor.id, vendorName: businessName, email, slug, ts: Date.now() });

      log.info("expo_signup", { userId, vendorId: vendor.id });
      return res.status(200).json({ ok: true, vendorId: vendor.id });
    },
  }),
});
