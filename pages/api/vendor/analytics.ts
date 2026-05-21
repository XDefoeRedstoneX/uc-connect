import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, "GET");

  const auth = await resolveAuthedUser(req);
  if (auth.status === 503) return sendServiceUnavailable(res);
  if (auth.status !== 200 || !auth.supabase || !auth.userId) {
    return res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
  }

  const { supabase, userId } = auth;

  const { data: vendor, error: vErr } = await supabase
    .from("vendors")
    .select("id,name,whatsapp_clicks")
    .eq("owner_id", userId)
    .maybeSingle();
  if (vErr) return sendInternalServerError(res, "Gagal memuat vendor");
  if (!vendor) return res.status(404).json({ error: "Vendor tidak ditemukan" });

  const nowIso = new Date().toISOString();

  const [metrics, itemsTotal, itemsActive, favs, slotsWon, activeSlot, wonBids, wallet] = await Promise.all([
    supabase.from("vendor_metrics").select("sample_rating,review_count,response_rate,avg_reply_time").eq("vendor_id", vendor.id).maybeSingle(),
    supabase.from("vendor_items").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id),
    supabase.from("vendor_items").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id).eq("is_active", true),
    supabase.from("favorites").select("vendor_id", { count: "exact", head: true }).eq("vendor_id", vendor.id),
    supabase.from("featured_slots").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id),
    supabase.from("featured_slots").select("id,rank,ends_at").eq("vendor_id", vendor.id).gt("ends_at", nowIso).order("rank", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("featured_bids").select("amount_idr").eq("vendor_id", vendor.id).eq("status", "won"),
    supabase.from("wallets").select("balance_idr").eq("user_id", userId).maybeSingle(),
  ]);

  const bidSpend = (wonBids.data ?? []).reduce((sum, b) => sum + (b.amount_idr ?? 0), 0);

  return res.status(200).json({
    vendor: { id: vendor.id, name: vendor.name },
    whatsapp_clicks: vendor.whatsapp_clicks ?? 0,
    sample_rating: metrics.data?.sample_rating ?? 0,
    review_count: metrics.data?.review_count ?? 0,
    response_rate: metrics.data?.response_rate ?? 0,
    avg_reply_time: metrics.data?.avg_reply_time ?? "Unknown",
    items_total: itemsTotal.count ?? 0,
    items_active: itemsActive.count ?? 0,
    favorites: favs.count ?? 0,
    featured_wins: slotsWon.count ?? 0,
    featured_active: activeSlot.data ? { rank: activeSlot.data.rank, ends_at: activeSlot.data.ends_at } : null,
    bid_spend_idr: bidSpend,
    wallet_balance_idr: wallet.data?.balance_idr ?? 0,
  });
}
