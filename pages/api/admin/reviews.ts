import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

export default createHandler({
  GET: method({
    auth: "admin",
    handler: async ({ req, supabase, res }) => {
      const filter = req.query.filter as string | undefined; // "low" | "recent" | "all"

      let query = supabase
        .from("vendor_reviews")
        .select(
          "id,vendor_id,user_id,rating,content,image_url,vendor_reply,vendor_reply_at,created_at," +
            "vendors:vendor_id(id,name,slug)," +
            "profiles:user_id(full_name,username,avatar_url)",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter === "low") query = query.lte("rating", 2);

      const { data, error } = await query;
      if (error) return sendInternalServerError(res, "Failed to load reviews", error);
      return res.status(200).json({ reviews: data ?? [] });
    },
  }),

  DELETE: method({
    auth: "admin",
    handler: async ({ supabase, userId: adminId, body, res }) => {
      const { review_id } = (body ?? {}) as { review_id?: string };
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
      if (error) return sendInternalServerError(res, "Failed to delete review", error);

      if (existing?.user_id && existing.user_id !== adminId) {
        await supabase.from("notifications").insert({
          user_id: existing.user_id,
          type: "content_removed",
          payload: { target_type: "review", preview: (existing.content ?? "").slice(0, 140) },
        });
      }

      return res.status(200).json({ success: true });
    },
  }),
});
