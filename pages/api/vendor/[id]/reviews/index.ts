import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { z } from "@/lib/validation";
import { log } from "@/lib/logger";

const REVIEW_COLUMNS =
  "id,vendor_id,user_id,rating,content,image_url,vendor_reply,vendor_reply_at,created_at,profiles:user_id(full_name,avatar_url)";

const reviewSchema = z.object({
  rating: z.coerce
    .number({ message: "Rating harus antara 1-5" })
    .refine((v) => v >= 1 && v <= 5, { message: "Rating harus antara 1-5" }),
  content: z.string().trim().optional(),
  image_url: z.string().optional(),
});

export default createHandler({
  GET: method({
    auth: "none",
    handler: async ({ req, supabase, res }) => {
      const vendorId = req.query.id as string;
      if (!vendorId) return res.status(400).json({ error: "Missing vendor id" });

      const { data, error } = await supabase
        .from("vendor_reviews")
        .select(REVIEW_COLUMNS)
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return sendInternalServerError(res, "Failed to load reviews", error);
      return res.status(200).json({ reviews: data ?? [] });
    },
  }),

  POST: method({
    auth: "user",
    rateLimit: { key: "review", limit: 10, windowMs: 60_000 },
    body: reviewSchema,
    handler: async ({ req, supabase, userId, body, res }) => {
      const vendorId = req.query.id as string;
      if (!vendorId) return res.status(400).json({ error: "Missing vendor id" });

      // Only accept image URLs that point at our own Supabase storage. If the
      // env var is missing the prefix would degenerate and reject every URL —
      // require it explicitly and fail loud rather than mis-validate.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        log.error("reviews_missing_supabase_url", { vendorId });
        return sendServiceUnavailable(res);
      }
      const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`;
      const cleanImageUrl =
        typeof body.image_url === "string" && body.image_url.startsWith(storagePrefix) ? body.image_url : null;

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
          rating: Math.round(body.rating),
          content: body.content?.trim() || null,
          image_url: cleanImageUrl,
        })
        .select("id,vendor_id,user_id,rating,content,image_url,vendor_reply,vendor_reply_at,created_at")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return res.status(409).json({ error: "Kamu sudah pernah memberikan ulasan untuk vendor ini" });
        }
        return sendInternalServerError(res, "Failed to save review", insertError);
      }

      return res.status(201).json({ review });
    },
  }),
});
