import type { SupabaseClient } from "@supabase/supabase-js";
import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";
import { z } from "@/lib/validation";

const MIN_BID = 1_000;
const BID_MSG = `Bid minimal Rp${MIN_BID.toLocaleString("id-ID")}`;

const bidSchema = z.object({
  amount_idr: z.coerce
    .number({ message: BID_MSG })
    .transform((v) => Math.floor(v))
    .refine((v) => Number.isFinite(v) && v >= MIN_BID, { message: BID_MSG }),
});

// The vendor this user owns (bids are per-vendor).
async function ownedVendor(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("vendors")
    .select("id,name,owner_id,is_verified")
    .eq("owner_id", userId)
    .maybeSingle();
  return data;
}

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ supabase, userId, res }) => {
      const vendor = await ownedVendor(supabase, userId);
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

      return res.status(200).json({
        vendor: { id: vendor.id, name: vendor.name },
        activeBid: activeBid ?? null,
        history: history ?? [],
      });
    },
  }),

  POST: method({
    auth: "user",
    rateLimit: { key: "bid", limit: 20, windowMs: 60_000 },
    body: bidSchema,
    handler: async ({ supabase, userId, body, res }) => {
      const vendor = await ownedVendor(supabase, userId);
      if (!vendor) return res.status(404).json({ error: "Kamu belum punya vendor" });
      if (!vendor.is_verified) {
        return res.status(403).json({ error: "Vendor harus terverifikasi dulu untuk ikut lelang featured" });
      }

      const amount = body.amount_idr;

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
        // Guard against the cron-vs-request race: if settlement flipped the row
        // to "settled" between our existence check and this update, the .eq
        // filter returns zero rows and we surface a 409 so the client can refresh.
        const { data: updated, error } = await supabase
          .from("featured_bids")
          .update({ amount_idr: amount, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .eq("status", "active")
          .select("id,vendor_id,round_date,amount_idr,status,created_at,updated_at")
          .maybeSingle();
        if (error) return sendInternalServerError(res, "Gagal memperbarui bid", error);
        if (!updated) {
          return res.status(409).json({ error: "Bid sudah masuk settlement, refresh dan submit ulang" });
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
        // Partial unique index (one active bid per vendor/round): a concurrent
        // double-submit that slipped past the existence check above lands here.
        if ((error as { code?: string }).code === "23505") {
          return res.status(409).json({ error: "Kamu sudah punya bid aktif untuk round ini. Refresh halaman." });
        }
        return sendInternalServerError(res, "Gagal membuat bid", error);
      }
      return res.status(201).json({ bid: created });
    },
  }),

  DELETE: method({
    auth: "user",
    handler: async ({ supabase, userId, res }) => {
      const vendor = await ownedVendor(supabase, userId);
      if (!vendor) return res.status(404).json({ error: "Kamu belum punya vendor" });
      // Same race window as POST update: a settlement that flipped the bid to
      // "settled" between the user's intent and our DELETE means zero rows match.
      const { data: deleted, error } = await supabase
        .from("featured_bids")
        .delete()
        .eq("vendor_id", vendor.id)
        .eq("status", "active")
        .select("id");
      if (error) return sendInternalServerError(res, "Gagal menarik bid", error);
      if (!deleted || deleted.length === 0) {
        return res.status(409).json({ error: "Bid sudah masuk settlement, tidak bisa ditarik" });
      }
      return res.status(200).json({ success: true });
    },
  }),
});
