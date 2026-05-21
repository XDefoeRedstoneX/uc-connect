import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";
import { rateLimited } from "@/lib/rate-limit";

const MIN_BID = 1_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await resolveAuthedUser(req);
  if (auth.status === 503) return sendServiceUnavailable(res);
  if (auth.status !== 200 || !auth.supabase || !auth.userId) {
    return res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
  }
  const { supabase, userId } = auth;

  // The vendor this user owns (bids are per-vendor).
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id,name,owner_id,is_verified")
    .eq("owner_id", userId)
    .maybeSingle();

  if (req.method === "GET") {
    if (!vendor) return res.status(200).json({ vendor: null, activeBid: null, history: [] });

    const { data: activeBid } = await supabase
      .from("featured_bids")
      .select("id,vendor_id,round_date,amount_idr,status,created_at,updated_at")
      .eq("vendor_id", vendor.id)
      .eq("status", "active")
      .maybeSingle();

    const { data: history } = await supabase
      .from("featured_bids")
      .select("id,round_date,amount_idr,status,created_at")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return res.status(200).json({ vendor: { id: vendor.id, name: vendor.name }, activeBid: activeBid ?? null, history: history ?? [] });
  }

  if (req.method === "POST") {
    if (rateLimited(res, `bid:${userId}`, { limit: 20, windowMs: 60_000 })) return;
    if (!vendor) return res.status(404).json({ error: "Kamu belum punya vendor" });
    if (!vendor.is_verified) return res.status(403).json({ error: "Vendor harus terverifikasi dulu untuk ikut lelang featured" });

    const amount = Math.floor(Number((req.body as { amount_idr?: number }).amount_idr));
    if (!Number.isFinite(amount) || amount < MIN_BID) {
      return res.status(400).json({ error: `Bid minimal Rp${MIN_BID.toLocaleString("id-ID")}` });
    }

    // Server-side balance gate: you cannot bid money you don't have.
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance_idr")
      .eq("user_id", userId)
      .maybeSingle();
    const balance = wallet?.balance_idr ?? 0;
    if (balance < amount) {
      return res.status(402).json({ error: "Saldo dompet tidak cukup untuk bid ini. Top up dulu.", balance_idr: balance });
    }

    const { data: existing } = await supabase
      .from("featured_bids")
      .select("id")
      .eq("vendor_id", vendor.id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from("featured_bids")
        .update({ amount_idr: amount, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("id,vendor_id,round_date,amount_idr,status,created_at,updated_at")
        .single();
      if (error) {
        console.error("[api/featured/bids POST update]", error);
        return sendInternalServerError(res, "Gagal memperbarui bid");
      }
      return res.status(200).json({ bid: updated });
    }

    // Target the next unsettled round so a manual settlement can't orphan this bid.
    const { data: roundData } = await supabase.rpc("next_bid_round");
    const round_date = (roundData as string | null) ?? undefined;

    const { data: created, error } = await supabase
      .from("featured_bids")
      .insert({ vendor_id: vendor.id, user_id: userId, amount_idr: amount, ...(round_date ? { round_date } : {}) })
      .select("id,vendor_id,round_date,amount_idr,status,created_at,updated_at")
      .single();
    if (error) {
      console.error("[api/featured/bids POST insert]", error);
      return sendInternalServerError(res, "Gagal membuat bid");
    }
    return res.status(201).json({ bid: created });
  }

  if (req.method === "DELETE") {
    if (!vendor) return res.status(404).json({ error: "Kamu belum punya vendor" });
    const { error } = await supabase
      .from("featured_bids")
      .delete()
      .eq("vendor_id", vendor.id)
      .eq("status", "active");
    if (error) {
      console.error("[api/featured/bids DELETE]", error);
      return sendInternalServerError(res, "Gagal menarik bid");
    }
    return res.status(200).json({ success: true });
  }

  return sendMethodNotAllowed(res, "GET, POST, DELETE");
}
