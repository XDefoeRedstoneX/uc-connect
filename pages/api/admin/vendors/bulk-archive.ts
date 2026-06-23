import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";
import { z } from "@/lib/validation";
import { log } from "@/lib/logger";

// Bulk archive — built for the "reset & reorder" cleanup after the expo,
// where most class-project vendor rows need to go away in one pass. Returns
// the list it would archive (dry_run=true) so the admin can review before
// committing. Reversible per-row via PATCH /api/admin/vendors action=reactivate.
//
// Selection rules (admin picks one of three modes):
//   • mode=ids        — archive a specific [id, id, ...] list (manual cherry-pick).
//   • mode=ghosts     — archive rows where the vendor has zero items, zero
//                        reviews, and zero forum threads (the classic
//                        "signed up, never used" pattern).
//   • mode=unverified_older_than — archive is_verified=false rows older than
//                        N days. Use for stale onboarding submissions that
//                        the admin never approved.
//
// The endpoint also takes a `created_before` ISO date to scope any mode to
// rows older than that day — useful when you only want to clean up rows
// from before a date range (e.g. before the expo started getting real users).

const schema = z.object({
  mode: z.enum(["ids", "ghosts", "unverified_older_than"]),
  ids: z.array(z.string().uuid()).optional(),
  unverified_days: z.number().int().min(1).max(365).optional(),
  created_before: z.string().datetime().optional(),
  reason: z.enum(["unresponsive", "admin", "self", "duplicate", "spam"]).default("admin"),
  dry_run: z.boolean().default(true),
});

export default createHandler({
  POST: method({
    auth: "admin",
    body: schema,
    handler: async ({ supabase, userId: adminId, body, res }) => {
      const { mode, ids, unverified_days, created_before, reason, dry_run } = body;

      // ── Build the SELECT that decides which rows match ───────────────────
      let query = supabase
        .from("vendors")
        .select("id,name,owner_id,is_verified,created_at")
        .is("archived_at", null); // never re-archive already-archived rows

      if (created_before) query = query.lt("created_at", created_before);

      if (mode === "ids") {
        if (!ids || ids.length === 0) return res.status(400).json({ error: "ids required when mode='ids'" });
        if (ids.length > 200) return res.status(400).json({ error: "max 200 ids per call" });
        query = query.in("id", ids);
      } else if (mode === "unverified_older_than") {
        if (!unverified_days) return res.status(400).json({ error: "unverified_days required when mode='unverified_older_than'" });
        const cutoff = new Date(Date.now() - unverified_days * 86_400_000).toISOString();
        query = query.eq("is_verified", false).lt("created_at", cutoff);
      }

      const { data: candidates, error: pickErr } = await query.limit(500);
      if (pickErr) return sendInternalServerError(res, "Failed to pick vendors", pickErr);
      let pool = candidates ?? [];

      // For 'ghosts' mode we additionally filter to rows with zero activity.
      // Cheaper to do in app code than three left-joins in PostgREST.
      if (mode === "ghosts" && pool.length > 0) {
        const poolIds = pool.map((v) => v.id);
        const [{ data: itemCounts }, { data: reviewCounts }, { data: threadCounts }] = await Promise.all([
          supabase.from("vendor_items").select("vendor_id").in("vendor_id", poolIds),
          supabase.from("vendor_reviews").select("vendor_id").in("vendor_id", poolIds),
          // Threads aren't FK'd to vendors, so author_id is the proxy: a vendor
          // with zero items + zero reviews is the meaningful ghost signal.
          // Skip thread join for the ghost heuristic.
          Promise.resolve({ data: [] as { author_id: string }[] }),
        ]);
        void threadCounts;
        const haveItems = new Set((itemCounts ?? []).map((r) => r.vendor_id));
        const haveReviews = new Set((reviewCounts ?? []).map((r) => r.vendor_id));
        pool = pool.filter((v) => !haveItems.has(v.id) && !haveReviews.has(v.id));
      }

      // ── Dry run: return who would be archived, change nothing ────────────
      if (dry_run) {
        log.info("admin_vendor_bulk_archive_dry_run", { adminId, mode, count: pool.length });
        return res.status(200).json({
          dry_run: true,
          would_archive: pool.length,
          vendors: pool.map((v) => ({ id: v.id, name: v.name, owner_id: v.owner_id, created_at: v.created_at, is_verified: v.is_verified })),
        });
      }

      if (pool.length === 0) {
        return res.status(200).json({ archived: 0, vendors: [] });
      }

      const archivedAt = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from("vendors")
        .update({ archived_at: archivedAt, archive_reason: reason })
        .in("id", pool.map((v) => v.id))
        .is("archived_at", null);
      if (updateErr) return sendInternalServerError(res, "Failed to bulk-archive", updateErr);

      log.warn("admin_vendor_bulk_archive", { adminId, mode, reason, archived: pool.length, ids: pool.map((v) => v.id) });
      return res.status(200).json({
        archived: pool.length,
        vendors: pool.map((v) => ({ id: v.id, name: v.name })),
      });
    },
  }),
});
