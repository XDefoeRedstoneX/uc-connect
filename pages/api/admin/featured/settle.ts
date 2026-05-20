import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendInternalServerError, sendMethodNotAllowed } from "@/lib/api-response";

// Manual settlement trigger. pg_cron runs this daily; this lets an admin run a
// round on demand (useful for demos and for recovering a missed cron run).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, "POST");

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;

  const { round_date } = req.body as { round_date?: string };
  // Default to "tomorrow" — the round most bids target (round_date = current_date + 1).
  const round = round_date ?? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc("settle_featured_auction", { p_round: round });
  if (error) {
    console.error("[api/admin/featured/settle]", error);
    return sendInternalServerError(res, "Gagal menjalankan settlement");
  }

  return res.status(200).json({ success: true, round_date: round, winners: data ?? 0 });
}
