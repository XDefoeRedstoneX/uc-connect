import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

// Manual settlement trigger. pg_cron runs this daily; this lets an admin run a
// round on demand (useful for demos and for recovering a missed cron run).
export default createHandler({
  POST: method({
    auth: "admin",
    handler: async ({ body, res }) => {
      // settle_featured_auction mutates featured_slots, wallet_ledger, and bid
      // rows across owners — service-role only. Anon fallback would partial-settle.
      const supabase = getSupabaseServiceClient();
      if (!supabase) return sendServiceUnavailable(res);

      const { round_date } = (body ?? {}) as { round_date?: string };
      // Default to "tomorrow" — the round most bids target (round_date = current_date + 1).
      const round = round_date ?? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

      const { data, error } = await supabase.rpc("settle_featured_auction", { p_round: round });
      if (error) return sendInternalServerError(res, "Gagal menjalankan settlement", error);

      return res.status(200).json({ success: true, round_date: round, winners: data ?? 0 });
    },
  }),
});
