import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import {
  CONFIRM_INTERVAL_DAYS,
  CONFIRM_RESPONSE_DAYS,
  CONFIRM_BATCH_SIZE,
} from "@/lib/vendor-confirmation";
import { log } from "@/lib/logger";

// Cron entrypoint — invoked by pg_cron after the confirmation grace window.
// Auto-archives vendors that were sent a confirmation email more than 30
// days ago AND still haven't confirmed (last_confirmed_at < now() - 90d).
// archive_reason = 'unresponsive' so admin tooling can distinguish it from
// manual archives. Gated by CRON_SECRET in X-Cron-Secret header.
//
// Reversible by the vendor themselves (POST /api/vendor/reactivate) — admin
// archive_reason policy denies self-reactivation, but 'unresponsive' allows it.

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

      const supabase = getSupabaseServiceClient();
      if (!supabase) return sendServiceUnavailable(res);

      const intervalCutoff = new Date(Date.now() - CONFIRM_INTERVAL_DAYS * 86_400_000).toISOString();
      const responseCutoff = new Date(Date.now() - CONFIRM_RESPONSE_DAYS * 86_400_000).toISOString();

      // Match exactly the same predicate as the SQL the cron would run if we
      // pushed the logic into Postgres — kept in app code so admins can also
      // hit the endpoint manually to dry-run / catch up after downtime.
      const { data: stale, error: pickErr } = await supabase
        .from("vendors")
        .select("id,name,owner_id")
        .is("archived_at", null)
        .lt("last_confirmed_at", intervalCutoff)
        .not("confirmation_sent_at", "is", null)
        .lt("confirmation_sent_at", responseCutoff)
        .limit(CONFIRM_BATCH_SIZE);
      if (pickErr) return sendInternalServerError(res, "Failed to pick stale vendors", pickErr);

      if (!stale || stale.length === 0) {
        return res.status(200).json({ archived: 0, vendors: [] });
      }

      // Bulk update; same predicate so a race with a vendor confirming
      // mid-flight doesn't archive them.
      const ids = stale.map((v) => v.id);
      const { error: updateErr } = await supabase
        .from("vendors")
        .update({
          archived_at: new Date().toISOString(),
          archive_reason: "unresponsive",
        })
        .in("id", ids)
        .is("archived_at", null)
        .lt("last_confirmed_at", intervalCutoff)
        .lt("confirmation_sent_at", responseCutoff);
      if (updateErr) return sendInternalServerError(res, "Failed to archive stale vendors", updateErr);

      log.warn("cron_vendor_auto_archive_run", { archived: stale.length, ids });
      return res.status(200).json({
        archived: stale.length,
        vendors: stale.map((v) => ({ id: v.id, name: v.name, ownerId: v.owner_id })),
      });
    },
  }),
});
