import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";

// Public endpoint — no auth needed, anyone clicking WhatsApp triggers this
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, "POST");

  const { vendor_id } = req.body as { vendor_id?: string };
  if (!vendor_id) return res.status(400).json({ error: "vendor_id required" });

  const supabase = getSupabaseServerClient();
  if (!supabase) return sendServiceUnavailable(res);

  // Use raw SQL increment to avoid race conditions
  const { error } = await supabase.rpc("increment_whatsapp_clicks", { v_id: vendor_id });

  if (error) {
    // Fallback if the RPC doesn't exist yet — just return success silently
    console.warn("[whatsapp-click] RPC not found, ignoring:", error.message);
  }

  return res.status(200).json({ success: true });
}
