import { createHandler, method } from "@/lib/api-handler";
import { z } from "@/lib/validation";
import { log } from "@/lib/logger";

// Public endpoint — no auth needed, anyone clicking WhatsApp triggers this.
const clickSchema = z.object({ vendor_id: z.string().trim().min(1, "vendor_id required") });

export default createHandler({
  POST: method({
    auth: "none",
    body: clickSchema,
    handler: async ({ supabase, body, res }) => {
      // Use raw SQL increment to avoid race conditions.
      const { error } = await supabase.rpc("increment_whatsapp_clicks", { v_id: body.vendor_id });
      if (error) {
        // Fallback if the RPC doesn't exist yet — just return success silently.
        log.warn("whatsapp_click_rpc_missing", { message: error.message });
      }
      return res.status(200).json({ success: true });
    },
  }),
});
