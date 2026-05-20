import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendInternalServerError, sendMethodNotAllowed } from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, "GET");

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;

  const nowIso = new Date().toISOString();

  const { data: slots, error: slotErr } = await supabase
    .from("featured_slots")
    .select("id,vendor_id,round_date,rank,amount_charged_idr,starts_at,ends_at,vendors:vendor_id(name)")
    .gt("ends_at", nowIso)
    .order("rank", { ascending: true });

  const { data: bids, error: bidErr } = await supabase
    .from("featured_bids")
    .select("id,vendor_id,round_date,amount_idr,status,created_at,vendors:vendor_id(name)")
    .eq("status", "active")
    .order("amount_idr", { ascending: false })
    .limit(100);

  if (slotErr || bidErr) {
    console.error("[api/admin/featured GET]", slotErr ?? bidErr);
    return sendInternalServerError(res, "Gagal memuat data featured");
  }

  return res.status(200).json({ activeSlots: slots ?? [], activeBids: bids ?? [] });
}
