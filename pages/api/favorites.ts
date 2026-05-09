import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import { sendMethodNotAllowed, sendServiceUnavailable, sendInternalServerError } from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await resolveAuthedUser(req);
  if (auth.status === 503) return sendServiceUnavailable(res);
  if (auth.status !== 200 || !auth.supabase || !auth.userId) {
    return res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
  }
  const { supabase, userId } = auth;

  // GET — list this user's favorited vendor IDs
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("favorites")
      .select("vendor_id")
      .eq("user_id", userId);

    if (error) return sendInternalServerError(res, "Failed to load favorites");
    return res.status(200).json({ vendorIds: (data ?? []).map((f: { vendor_id: string }) => f.vendor_id) });
  }

  // POST — add a favorite
  if (req.method === "POST") {
    const { vendor_id } = req.body as { vendor_id?: string };
    if (!vendor_id) return res.status(400).json({ error: "vendor_id required" });

    const { error } = await supabase
      .from("favorites")
      .upsert({ user_id: userId, vendor_id }, { onConflict: "user_id,vendor_id" });

    if (error) return sendInternalServerError(res, "Failed to add favorite");
    return res.status(201).json({ success: true });
  }

  // DELETE — remove a favorite
  if (req.method === "DELETE") {
    const { vendor_id } = req.body as { vendor_id?: string };
    if (!vendor_id) return res.status(400).json({ error: "vendor_id required" });

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("vendor_id", vendor_id);

    if (error) return sendInternalServerError(res, "Failed to remove favorite");
    return res.status(200).json({ success: true });
  }

  return sendMethodNotAllowed(res, "GET, POST, DELETE");
}
