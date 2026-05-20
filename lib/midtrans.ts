import crypto from "crypto";

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? "";
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

const SNAP_BASE = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

export function isMidtransConfigured() {
  return SERVER_KEY.length > 0;
}

type CreateSnapArgs = {
  orderId: string;
  amountIdr: number;
  customerName?: string;
  customerEmail?: string;
};

/** Creates a Snap transaction and returns its token. Server-side only. */
export async function createSnapTransaction({
  orderId,
  amountIdr,
  customerName,
  customerEmail,
}: CreateSnapArgs): Promise<{ token: string; redirect_url: string }> {
  if (!isMidtransConfigured()) {
    throw new Error("MIDTRANS_SERVER_KEY is not configured");
  }

  const auth = Buffer.from(`${SERVER_KEY}:`).toString("base64");

  const res = await fetch(SNAP_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amountIdr },
      customer_details: {
        first_name: customerName || "UC Connect Vendor",
        email: customerEmail || undefined,
      },
      // Wallet top-ups are not shippable goods; keep it minimal.
      credit_card: { secure: true },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midtrans Snap create failed (${res.status}): ${text}`);
  }

  return (await res.json()) as { token: string; redirect_url: string };
}

type MidtransNotification = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
};

/**
 * Verifies the SHA-512 signature Midtrans sends with each notification:
 *   sha512(order_id + status_code + gross_amount + server_key)
 * Returns false on any mismatch so callers can reject forged callbacks.
 */
export function verifyMidtransSignature(n: MidtransNotification): boolean {
  if (!n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false;
  const expected = crypto
    .createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${SERVER_KEY}`)
    .digest("hex");
  // timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(n.signature_key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Maps Midtrans transaction_status/fraud_status to our topup status. */
export function mapMidtransStatus(n: MidtransNotification): "settled" | "pending" | "failed" {
  const status = n.transaction_status;
  if (status === "capture") {
    return n.fraud_status === "accept" ? "settled" : "pending";
  }
  if (status === "settlement") return "settled";
  if (status === "pending") return "pending";
  // deny, cancel, expire, failure, refund, chargeback → treat as failed/closed
  return "failed";
}
