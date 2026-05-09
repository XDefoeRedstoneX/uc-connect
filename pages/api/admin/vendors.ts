import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendMethodNotAllowed, sendInternalServerError } from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;

  // GET — list vendors with optional filter
  if (req.method === "GET") {
    const status = req.query.status as string | undefined; // "pending" | "verified" | "all"
    let query = supabase
      .from("vendors")
      .select("id,slug,name,tagline,category,city,whatsapp,is_verified,created_at,owner_id,university,ktm_url,profiles!vendors_owner_id_fkey(full_name,email:username)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (status === "pending") query = query.eq("is_verified", false);
    else if (status === "verified") query = query.eq("is_verified", true);

    const { data, error } = await query;
    if (error) return sendInternalServerError(res, "Failed to load vendors");
    return res.status(200).json({ vendors: data ?? [] });
  }

  // PATCH — approve or reject vendor
  if (req.method === "PATCH") {
    const { vendor_id, action } = req.body as { vendor_id?: string; action?: "approve" | "reject" };
    if (!vendor_id || !action) return res.status(400).json({ error: "vendor_id and action required" });

    if (action === "approve") {
      const { error } = await supabase.from("vendors").update({ is_verified: true }).eq("id", vendor_id);
      if (error) return sendInternalServerError(res, "Failed to approve vendor");
      return res.status(200).json({ success: true, is_verified: true });
    }

    if (action === "reject") {
      // Delete the vendor record entirely
      const { error } = await supabase.from("vendors").delete().eq("id", vendor_id);
      if (error) return sendInternalServerError(res, "Failed to reject vendor");
      // Optionally reset the user's role back to customer
      const { data: vendor } = await supabase.from("vendors").select("owner_id").eq("id", vendor_id).maybeSingle();
      if (vendor?.owner_id) {
        await supabase.from("profiles").update({ role: "customer" }).eq("id", vendor.owner_id);
      }
      return res.status(200).json({ success: true, deleted: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  }

  return sendMethodNotAllowed(res, "GET, PATCH");
}
