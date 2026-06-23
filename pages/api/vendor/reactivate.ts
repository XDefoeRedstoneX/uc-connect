import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";
import { log } from "@/lib/logger";

// Self-reactivation. A vendor whose listing was auto-archived (unresponsive)
// or self-archived can log in and bring their shop back live. Admin-archived
// vendors must be reactivated by an admin — if they were taken down for
// moderation reasons, letting them self-restore would be a policy bypass.
export default createHandler({
  POST: method({
    auth: "user",
    rateLimit: { key: "vendor-reactivate", limit: 5, windowMs: 60_000 },
    handler: async ({ supabase, userId, res }) => {
      const { data: vendor, error: lookupErr } = await supabase
        .from("vendors")
        .select("id,archived_at,archive_reason")
        .eq("owner_id", userId)
        .maybeSingle();
      if (lookupErr) return sendInternalServerError(res, "Gagal memuat vendor", lookupErr);
      if (!vendor) return res.status(404).json({ error: "Vendor tidak ditemukan" });
      if (!vendor.archived_at) {
        return res.status(409).json({ error: "Vendor sudah aktif." });
      }
      if (vendor.archive_reason === "admin" || vendor.archive_reason === "spam") {
        return res.status(403).json({
          error: "Vendor diarsipkan oleh admin. Hubungi support untuk peninjauan.",
        });
      }

      const { error } = await supabase
        .from("vendors")
        .update({
          archived_at: null,
          archive_reason: null,
          last_confirmed_at: new Date().toISOString(),
          confirmation_token_hash: null,
          confirmation_sent_at: null,
        })
        .eq("id", vendor.id);
      if (error) return sendInternalServerError(res, "Gagal mengaktifkan vendor", error);

      log.info("vendor_self_reactivate", { vendorId: vendor.id, ownerId: userId, prevReason: vendor.archive_reason });
      return res.status(200).json({ success: true });
    },
  }),
});
