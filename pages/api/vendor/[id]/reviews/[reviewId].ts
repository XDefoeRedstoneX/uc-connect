import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const vendorId = req.query.id as string;
  const reviewId = req.query.reviewId as string;
  if (!vendorId || !reviewId) return res.status(400).json({ error: "Missing vendor id or review id" });

  if (req.method !== "PATCH") return sendMethodNotAllowed(res, "PATCH");

  const authContext = await resolveAuthedUser(req);
  if (authContext.status === 503) return sendServiceUnavailable(res);
  if (authContext.status !== 200 || !authContext.supabase || !authContext.userId) {
    return res.status(authContext.status).json({ error: authContext.error ?? "Unauthorized" });
  }

  const { supabase, userId } = authContext;
  const { vendor_reply } = req.body as { vendor_reply?: string | null };

  // Confirm the caller owns the vendor whose review they're replying to.
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id,owner_id")
    .eq("id", vendorId)
    .maybeSingle();

  if (vendorError) return sendInternalServerError(res, "Failed to load vendor");
  if (!vendor) return res.status(404).json({ error: "Vendor tidak ditemukan" });
  if (vendor.owner_id !== userId) return res.status(403).json({ error: "Bukan pemilik vendor" });

  const trimmed = typeof vendor_reply === "string" ? vendor_reply.trim() : null;
  const update = trimmed
    ? { vendor_reply: trimmed, vendor_reply_at: new Date().toISOString() }
    : { vendor_reply: null, vendor_reply_at: null };

  const { data: review, error: updateError } = await supabase
    .from("vendor_reviews")
    .update(update)
    .eq("id", reviewId)
    .eq("vendor_id", vendorId)
    .select("id,vendor_id,user_id,rating,content,vendor_reply,vendor_reply_at,created_at")
    .single();

  if (updateError) {
    console.error("[api/vendor/[id]/reviews/[reviewId] PATCH]", updateError);
    return sendInternalServerError(res, "Failed to save reply");
  }

  return res.status(200).json({ review });
}
