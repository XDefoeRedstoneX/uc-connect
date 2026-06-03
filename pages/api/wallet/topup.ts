import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { resolveAuthedUser } from "@/lib/api-auth";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";
import { createSnapTransaction, isMidtransConfigured } from "@/lib/midtrans";
import { rateLimited } from "@/lib/rate-limit";

const MIN_TOPUP = 10_000;
const MAX_TOPUP = 10_000_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, "POST");

  const auth = await resolveAuthedUser(req);
  if (auth.status === 503) return sendServiceUnavailable(res);
  if (auth.status !== 200 || !auth.supabase || !auth.userId || !auth.user) {
    return res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
  }
  if (!isMidtransConfigured()) {
    return res.status(503).json({ error: "Pembayaran belum dikonfigurasi (MIDTRANS_SERVER_KEY)" });
  }

  const { supabase, userId, user } = auth;
  if (rateLimited(res, `topup:${userId}`, { limit: 10, windowMs: 60_000 })) return;

  const { amount_idr } = req.body as { amount_idr?: number };

  const amount = Math.floor(Number(amount_idr));
  if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
    return res.status(400).json({ error: `Nominal top-up harus antara Rp${MIN_TOPUP.toLocaleString("id-ID")} dan Rp${MAX_TOPUP.toLocaleString("id-ID")}` });
  }

  // Server-generated order id — never trust the client for the amount or id.
  // randomUUID() instead of Date.now() so two top-ups created in the same
  // millisecond can't collide on the topups.order_id unique constraint.
  const orderId = `ucc-topup-${userId.slice(0, 8)}-${randomUUID()}`;

  const { error: insertError } = await supabase.from("topups").insert({
    user_id: userId,
    order_id: orderId,
    amount_idr: amount,
    status: "pending",
  });
  if (insertError) {
    console.error("[api/wallet/topup] insert", insertError);
    return sendInternalServerError(res, "Gagal membuat transaksi top-up");
  }

  let snap: { token: string; redirect_url: string };
  try {
    snap = await createSnapTransaction({
      orderId,
      amountIdr: amount,
      customerName: (user.user_metadata?.full_name as string) || undefined,
      customerEmail: user.email || undefined,
    });
  } catch (e) {
    console.error("[api/wallet/topup] snap", e);
    await supabase.from("topups").update({ status: "failed" }).eq("order_id", orderId);
    return sendInternalServerError(res, "Gagal membuat sesi pembayaran");
  }

  await supabase.from("topups").update({ snap_token: snap.token }).eq("order_id", orderId);

  return res.status(201).json({ order_id: orderId, token: snap.token, redirect_url: snap.redirect_url });
}
