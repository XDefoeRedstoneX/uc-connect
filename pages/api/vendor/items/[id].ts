import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authContext = await resolveAuthedUser(req);
  if (authContext.status === 503) return sendServiceUnavailable(res);
  if (authContext.status !== 200 || !authContext.supabase || !authContext.userId) {
    return res.status(authContext.status).json({ error: authContext.error ?? "Unauthorized" });
  }
  const { supabase, userId } = authContext;

  const itemId = req.query.id as string;
  if (!itemId) return res.status(400).json({ error: "Item ID required" });

  // Verify ownership via join
  const { data: item } = await supabase
    .from("vendor_items")
    .select("id, vendor_id, vendors!inner(owner_id)")
    .eq("id", itemId)
    .maybeSingle();

  const vendorOwner = (item?.vendors as unknown as { owner_id: string } | null)?.owner_id;
  if (!item || vendorOwner !== userId) {
    return res.status(404).json({ error: "Item not found" });
  }

  if (req.method === "PUT") {
    const { name, description, price, currency, image_url, is_active, sort_order } = req.body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = typeof description === "string" ? description.trim() || null : null;
    if (price !== undefined) {
      const p = parseFloat(String(price));
      if (!isNaN(p) && p >= 0) updates.price = p;
    }
    if (typeof currency === "string" && currency.trim()) updates.currency = currency.trim();
    if (typeof image_url === "string") updates.image_url = image_url.trim() || null;
    if (typeof is_active === "boolean") updates.is_active = is_active;
    if (typeof sort_order === "number") updates.sort_order = sort_order;

    const { data: updated, error } = await supabase
      .from("vendor_items")
      .update(updates)
      .eq("id", itemId)
      .select("id,item_type,name,description,price,currency,image_url,sort_order,is_active,created_at")
      .maybeSingle();

    if (error) {
      console.error("[api/vendor/items/[id] PUT]", error);
      return sendInternalServerError(res, "Failed to update item");
    }

    return res.status(200).json({ item: updated });
  }

  if (req.method === "DELETE") {
    const { error } = await supabase.from("vendor_items").delete().eq("id", itemId);
    if (error) {
      console.error("[api/vendor/items/[id] DELETE]", error);
      return sendInternalServerError(res, "Failed to delete item");
    }
    return res.status(200).json({ success: true });
  }

  return sendMethodNotAllowed(res, "PUT, DELETE");
}
