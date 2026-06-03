import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendInternalServerError, sendMethodNotAllowed } from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;

  if (req.method === "GET") {
    const filter = req.query.filter as string | undefined; // "low" | "recent" | "all"

    let query = supabase
      .from("vendor_reviews")
      .select(
        "id,vendor_id,user_id,rating,content,image_url,vendor_reply,vendor_reply_at,created_at," +
        "vendors:vendor_id(id,name,slug)," +
        "profiles:user_id(full_name,username,avatar_url)"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter === "low") query = query.lte("rating", 2);

    const { data, error } = await query;
    if (error) {
      console.error("[api/admin/reviews GET]", error);
      return sendInternalServerError(res, "Failed to load reviews");
    }
    return res.status(200).json({ reviews: data ?? [] });
  }

  if (req.method === "DELETE") {
    const { review_id } = req.body as { review_id?: string };
    if (!review_id) return res.status(400).json({ error: "review_id required" });

    // Fire content_removed notification from the API (not via DB trigger) so
    // the path is the same whether the admin acts through service-role or via
    // the browser. Skip when the author is the acting admin (self-delete).
    const { data: existing } = await supabase
      .from("vendor_reviews")
      .select("user_id,content")
      .eq("id", review_id)
      .maybeSingle();

    const { error } = await supabase.from("vendor_reviews").delete().eq("id", review_id);
    if (error) {
      console.error("[api/admin/reviews DELETE]", error);
      return sendInternalServerError(res, "Failed to delete review");
    }

    if (existing?.user_id && existing.user_id !== ctx.userId) {
      await supabase.from("notifications").insert({
        user_id: existing.user_id,
        type: "content_removed",
        payload: { target_type: "review", preview: (existing.content ?? "").slice(0, 140) },
      });
    }

    return res.status(200).json({ success: true });
  }

  return sendMethodNotAllowed(res, "GET, DELETE");
}
