import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, "GET");

  const auth = await resolveAuthedUser(req);
  if (auth.status === 503) return sendServiceUnavailable(res);
  if (auth.status !== 200 || !auth.supabase || !auth.userId) {
    return res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
  }

  const { supabase, userId } = auth;

  const { data: wallet } = await supabase
    .from("wallets")
    .select("user_id,balance_idr,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: transactions, error: txError } = await supabase
    .from("wallet_transactions")
    .select("id,type,amount_idr,balance_after,reference,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (txError) {
    console.error("[api/wallet GET]", txError);
    return sendInternalServerError(res, "Gagal memuat dompet");
  }

  return res.status(200).json({
    balance_idr: wallet?.balance_idr ?? 0,
    transactions: transactions ?? [],
  });
}
