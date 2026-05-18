import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const REVIEW_COLUMNS =
  "id,vendor_id,user_id,rating,content,vendor_reply,vendor_reply_at,created_at,profiles:user_id(full_name,avatar_url)";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const vendorId = req.query.id as string;
  if (!vendorId) return res.status(400).json({ error: "Missing vendor id" });

  if (req.method === "GET") {
    const supabase = getSupabaseServerClient();
    if (!supabase) return sendServiceUnavailable(res);

    const { data, error } = await supabase
      .from("vendor_reviews")
      .select(REVIEW_COLUMNS)
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[api/vendor/[id]/reviews GET]", error);
      return sendInternalServerError(res, "Failed to load reviews");
    }

    return res.status(200).json({ reviews: data ?? [] });
  }

  if (req.method === "POST") {
    const authContext = await resolveAuthedUser(req);
    if (authContext.status === 503) return sendServiceUnavailable(res);
    if (authContext.status !== 200 || !authContext.supabase || !authContext.userId) {
      return res.status(authContext.status).json({ error: authContext.error ?? "Unauthorized" });
    }

    const { supabase, userId } = authContext;
    const { rating, content } = req.body as { rating?: number; content?: string };

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating harus antara 1-5" });
    }

    const { data: vendor } = await supabase
      .from("vendors")
      .select("id,owner_id")
      .eq("id", vendorId)
      .maybeSingle();

    if (!vendor) return res.status(404).json({ error: "Vendor tidak ditemukan" });

    if (vendor.owner_id === userId) {
      return res.status(403).json({ error: "Tidak bisa mereview toko sendiri" });
    }

    const { data: review, error: insertError } = await supabase
      .from("vendor_reviews")
      .insert({
        vendor_id: vendorId,
        user_id: userId,
        rating: Math.round(rating),
        content: content?.trim() || null,
      })
      .select("id,vendor_id,user_id,rating,content,vendor_reply,vendor_reply_at,created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(409).json({ error: "Kamu sudah pernah memberikan ulasan untuk vendor ini" });
      }
      console.error("[api/vendor/[id]/reviews POST]", insertError);
      return sendInternalServerError(res, "Failed to save review");
    }

    return res.status(201).json({ review });
  }

  return sendMethodNotAllowed(res, "GET, POST");
}
