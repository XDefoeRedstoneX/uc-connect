import type { NextApiRequest, NextApiResponse } from "next";
import { sendMethodNotAllowed } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { verifyMidtransSignature, mapMidtransStatus } from "@/lib/midtrans";
import { log } from "@/lib/logger";

// Midtrans posts JSON server-to-server. No bearer token — trust is established
// purely by the SHA-512 signature, so verification is mandatory.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, "POST");

  const body = (req.body ?? {}) as Record<string, string>;

  if (!verifyMidtransSignature(body)) {
    log.warn("midtrans_webhook_bad_signature", { order_id: body.order_id });
    return res.status(403).json({ error: "Invalid signature" });
  }

  // settle_topup RPC writes to wallet_ledger + topups under SECURITY DEFINER;
  // without the service-role key the anon fallback would silently fail RLS,
  // leaving payments unsettled. Hard-fail instead.
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    log.error("midtrans_webhook_no_service_role", { order_id: body.order_id });
    return res.status(503).json({ error: "Service unavailable" });
  }

  const orderId = body.order_id;
  const mapped = mapMidtransStatus(body);

  if (mapped === "settled") {
    // Atomic, exactly-once settlement: the SQL function transitions the topup
    // pending→settled and credits the wallet in one transaction. Repeat
    // deliveries return false and do nothing.
    const { data: credited, error } = await supabase.rpc("settle_topup", {
      p_order_id: orderId,
      p_callback: body,
    });
    if (error) {
      log.error("midtrans_settle_topup_failed", { order_id: orderId, message: error.message });
      return res.status(500).json({ error: "settle failed" });
    }
    log.info("midtrans_topup_settled", { order_id: orderId, credited: credited === true });
    return res.status(200).json({ received: true, credited: credited === true });
  }

  if (mapped === "failed") {
    await supabase
      .from("topups")
      .update({ status: "failed", raw_callback: body })
      .eq("order_id", orderId)
      .eq("status", "pending");
    return res.status(200).json({ received: true, failed: true });
  }

  // pending — record the callback, leave status pending.
  await supabase.from("topups").update({ raw_callback: body }).eq("order_id", orderId).eq("status", "pending");
  return res.status(200).json({ received: true, pending: true });
}
