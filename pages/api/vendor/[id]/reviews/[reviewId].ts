import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

export default createHandler({
  PATCH: method({
    auth: "user",
    handler: async ({ req, supabase, userId, body, res }) => {
      const vendorId = req.query.id as string;
      const reviewId = req.query.reviewId as string;
      if (!vendorId || !reviewId) return res.status(400).json({ error: "Missing vendor id or review id" });

      const { vendor_reply } = (body ?? {}) as { vendor_reply?: string | null };

      // Confirm the caller owns the vendor whose review they're replying to.
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("id,owner_id,name")
        .eq("id", vendorId)
        .maybeSingle();

      if (vendorError) return sendInternalServerError(res, "Failed to load vendor", vendorError);
      if (!vendor) return res.status(404).json({ error: "Vendor tidak ditemukan" });
      if (vendor.owner_id !== userId) return res.status(403).json({ error: "Bukan pemilik vendor" });

      // Snapshot the prior reply so we can detect the first-time reply transition
      // and notify the reviewer only on null → text (skip edits and clears).
      const { data: prior } = await supabase
        .from("vendor_reviews")
        .select("user_id,vendor_reply,content")
        .eq("id", reviewId)
        .eq("vendor_id", vendorId)
        .maybeSingle();

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

      if (updateError) return sendInternalServerError(res, "Failed to save reply", updateError);

      const isFirstReply = trimmed && !prior?.vendor_reply;
      if (isFirstReply && prior?.user_id && prior.user_id !== userId) {
        await supabase.from("notifications").insert({
          user_id: prior.user_id,
          type: "review_replied",
          payload: {
            vendor_id: vendorId,
            vendor_name: vendor.name,
            review_id: reviewId,
            preview: trimmed.slice(0, 140),
          },
        });
      }

      return res.status(200).json({ review });
    },
  }),
});
