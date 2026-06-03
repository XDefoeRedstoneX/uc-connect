import { randomUUID } from "crypto";
import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";
import { createSnapTransaction, isMidtransConfigured } from "@/lib/midtrans";
import { z } from "@/lib/validation";

const MIN_TOPUP = 10_000;
const MAX_TOPUP = 10_000_000;
const TOPUP_MSG = `Nominal top-up harus antara Rp${MIN_TOPUP.toLocaleString("id-ID")} dan Rp${MAX_TOPUP.toLocaleString("id-ID")}`;

const topupSchema = z.object({
  amount_idr: z.coerce
    .number({ message: TOPUP_MSG })
    .transform((v) => Math.floor(v))
    .refine((v) => Number.isFinite(v) && v >= MIN_TOPUP && v <= MAX_TOPUP, { message: TOPUP_MSG }),
});

export default createHandler({
  POST: method({
    auth: "user",
    rateLimit: { key: "topup", limit: 10, windowMs: 60_000 },
    body: topupSchema,
    handler: async ({ supabase, userId, user, body, res }) => {
      if (!isMidtransConfigured()) {
        return res.status(503).json({ error: "Pembayaran belum dikonfigurasi (MIDTRANS_SERVER_KEY)" });
      }

      const amount = body.amount_idr;

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
      if (insertError) return sendInternalServerError(res, "Gagal membuat transaksi top-up", insertError);

      let snap: { token: string; redirect_url: string };
      try {
        snap = await createSnapTransaction({
          orderId,
          amountIdr: amount,
          customerName: (user?.user_metadata?.full_name as string) || undefined,
          customerEmail: user?.email || undefined,
        });
      } catch (e) {
        await supabase.from("topups").update({ status: "failed" }).eq("order_id", orderId);
        return sendInternalServerError(res, "Gagal membuat sesi pembayaran", e);
      }

      await supabase.from("topups").update({ snap_token: snap.token }).eq("order_id", orderId);

      return res.status(201).json({ order_id: orderId, token: snap.token, redirect_url: snap.redirect_url });
    },
  }),
});
