import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import {
  generateConfirmationToken,
  hashConfirmationToken,
  buildConfirmUrl,
  CONFIRM_INTERVAL_DAYS,
  CONFIRM_RESPONSE_DAYS,
  CONFIRM_BATCH_SIZE,
} from "@/lib/vendor-confirmation";
import { log } from "@/lib/logger";

// Cron entrypoint — invoked by pg_cron (or Vercel cron, or a manual curl) to
// send "is your vendor still active?" emails. Gated by CRON_SECRET in the
// X-Cron-Secret header so it isn't a public mailing trigger.
//
// Picks vendors where:
//   - archived_at IS NULL
//   - last_confirmed_at < now() - 90d
//   - confirmation_sent_at IS NULL OR confirmation_sent_at < now() - 30d
//     (re-send window: if the first email bounced or was missed, retry once
//      the grace period has elapsed, before the auto-archive job kicks in).
//
// Each picked vendor gets a fresh single-use token; old hash is overwritten.

export default createHandler({
  POST: method({
    auth: "none",
    handler: async ({ req, res }) => {
      const secret = process.env.CRON_SECRET;
      if (!secret) {
        log.error("cron_secret_missing");
        return sendServiceUnavailable(res);
      }
      const provided = req.headers["x-cron-secret"];
      if (provided !== secret) return res.status(403).json({ error: "Forbidden" });

      if (!isEmailConfigured()) {
        log.warn("cron_vendor_confirmation_no_email");
        return res.status(503).json({ error: "RESEND_API_KEY missing" });
      }

      const supabase = getSupabaseServiceClient();
      if (!supabase) return sendServiceUnavailable(res);

      const intervalCutoff = new Date(Date.now() - CONFIRM_INTERVAL_DAYS * 86_400_000).toISOString();
      const resendCutoff   = new Date(Date.now() - CONFIRM_RESPONSE_DAYS * 86_400_000).toISOString();

      // Two-clause OR: confirmation never sent, OR last send is older than
      // the grace period (a retry — the auto-archive job hasn't run yet).
      const { data: due, error } = await supabase
        .from("vendors")
        .select("id,name,owner_id,confirmation_sent_at")
        .is("archived_at", null)
        .lt("last_confirmed_at", intervalCutoff)
        .or(`confirmation_sent_at.is.null,confirmation_sent_at.lt.${resendCutoff}`)
        .limit(CONFIRM_BATCH_SIZE);
      if (error) return sendInternalServerError(res, "Failed to load due vendors", error);

      const results: { vendorId: string; status: "sent" | "no_owner" | "no_email" | "failed"; reason?: string }[] = [];

      for (const v of due ?? []) {
        if (!v.owner_id) {
          // Orphan vendor (admin-created via /admin/expo etc.) — skip until claimed.
          results.push({ vendorId: v.id, status: "no_owner" });
          continue;
        }

        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(v.owner_id);
        if (userErr || !userData?.user?.email) {
          results.push({ vendorId: v.id, status: "no_email", reason: userErr?.message });
          continue;
        }
        const email = userData.user.email;
        const fullName = (userData.user.user_metadata?.full_name as string | undefined) ?? "Vendor";

        const token = generateConfirmationToken();
        const link = buildConfirmUrl(v.id, token);

        // Persist hash + sent-at BEFORE emailing so a transient send failure
        // doesn't double-send if the cron retries within the same minute.
        const { error: updateErr } = await supabase
          .from("vendors")
          .update({
            confirmation_token_hash: hashConfirmationToken(token),
            confirmation_sent_at: new Date().toISOString(),
          })
          .eq("id", v.id);
        if (updateErr) {
          results.push({ vendorId: v.id, status: "failed", reason: updateErr.message });
          continue;
        }

        const result = await sendEmail({
          to: email,
          subject: `Apakah tokomu "${v.name}" masih aktif? — UC Connect`,
          text:
            `Halo ${fullName},\n\n` +
            `Sudah ${CONFIRM_INTERVAL_DAYS} hari sejak konfirmasi terakhir untuk toko kamu "${v.name}" di UC Connect.\n\n` +
            `Klik link ini untuk memperpanjang masa aktif selama ${CONFIRM_INTERVAL_DAYS} hari lagi:\n${link}\n\n` +
            `Kalau kami tidak mendapat respons dalam ${CONFIRM_RESPONSE_DAYS} hari, toko kamu akan kami arsipkan otomatis. ` +
            `Kamu tetap bisa mengaktifkannya kapan saja dengan login ke akun.\n\n` +
            `— Tim UC Connect`,
          html: confirmationEmailHtml({ name: fullName, vendorName: v.name, link }),
        });

        if (result.ok) {
          results.push({ vendorId: v.id, status: "sent" });
        } else if ("skipped" in result) {
          results.push({ vendorId: v.id, status: "failed", reason: result.reason });
        } else {
          results.push({ vendorId: v.id, status: "failed", reason: result.message });
        }
      }

      const sent = results.filter((r) => r.status === "sent").length;
      log.info("cron_vendor_confirmation_run", { picked: due?.length ?? 0, sent });
      return res.status(200).json({ picked: due?.length ?? 0, sent, results });
    },
  }),
});

function confirmationEmailHtml({ name, vendorName, link }: { name: string; vendorName: string; link: string }) {
  // Inline styles only; many email clients strip <style> blocks.
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#f5f7fa;padding:24px;margin:0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
    <tr><td style="padding:32px 32px 8px">
      <h1 style="margin:0 0 16px;font-size:20px;color:#0E7A94">Apakah toko kamu masih aktif?</h1>
      <p style="margin:0 0 12px;line-height:1.55;color:#374151">Halo ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;line-height:1.55;color:#374151">
        Sudah ${CONFIRM_INTERVAL_DAYS} hari sejak konfirmasi terakhir untuk toko kamu
        <strong>${escapeHtml(vendorName)}</strong> di UC Connect.
      </p>
      <p style="margin:0 0 20px;line-height:1.55;color:#374151">
        Klik tombol di bawah untuk memperpanjang masa aktif selama ${CONFIRM_INTERVAL_DAYS} hari lagi.
      </p>
      <p style="text-align:center;margin:24px 0">
        <a href="${link}" style="display:inline-block;background:#1CA9C9;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">Ya, masih aktif</a>
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.5">
        Kalau kami tidak mendapat respons dalam ${CONFIRM_RESPONSE_DAYS} hari, toko akan diarsipkan otomatis.
        Kamu tetap bisa mengaktifkannya kapan saja lewat dashboard vendor.
      </p>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;word-break:break-all">
        Atau buka link berikut: ${link}
      </p>
    </td></tr>
    <tr><td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
      UC Connect — Direktori Bisnis Mahasiswa
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
