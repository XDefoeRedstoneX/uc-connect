import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ supabase, userId, res }) => {
      const { data, error } = await supabase
        .from("vendor_reviews")
        .select("id,vendor_id,rating,content,image_url,vendor_reply,created_at,vendors:vendor_id(id,name,slug)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return sendInternalServerError(res, "Gagal memuat ulasan", error);
      return res.status(200).json({ reviews: data ?? [] });
    },
  }),
});
