import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";
import { z } from "@/lib/validation";

const vendorIdSchema = z.object({ vendor_id: z.string().trim().min(1, "vendor_id required") });

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ supabase, userId, res }) => {
      const { data, error } = await supabase
        .from("favorites")
        .select("vendor_id")
        .eq("user_id", userId);

      if (error) return sendInternalServerError(res, "Failed to load favorites", error);
      return res.status(200).json({ vendorIds: (data ?? []).map((f: { vendor_id: string }) => f.vendor_id) });
    },
  }),

  POST: method({
    auth: "user",
    body: vendorIdSchema,
    handler: async ({ supabase, userId, body, res }) => {
      const { error } = await supabase
        .from("favorites")
        .upsert({ user_id: userId, vendor_id: body.vendor_id }, { onConflict: "user_id,vendor_id" });

      if (error) return sendInternalServerError(res, "Failed to add favorite", error);
      return res.status(201).json({ success: true });
    },
  }),

  DELETE: method({
    auth: "user",
    body: vendorIdSchema,
    handler: async ({ supabase, userId, body, res }) => {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("vendor_id", body.vendor_id);

      if (error) return sendInternalServerError(res, "Failed to remove favorite", error);
      return res.status(200).json({ success: true });
    },
  }),
});
