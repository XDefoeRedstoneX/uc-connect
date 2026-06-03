import type { SupabaseClient } from "@supabase/supabase-js";
import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

const ITEM_COLUMNS = "id,item_type,name,description,price,currency,image_url,sort_order,is_active,created_at";

// Verify the caller owns the vendor this item belongs to. Returns the item id
// when owned, or null (caller responds 404 to avoid leaking existence).
async function ownedItemId(supabase: SupabaseClient, itemId: string, userId: string): Promise<string | null> {
  const { data: item } = await supabase
    .from("vendor_items")
    .select("id, vendor_id, vendors!inner(owner_id)")
    .eq("id", itemId)
    .maybeSingle();
  const vendorOwner = (item?.vendors as unknown as { owner_id: string } | null)?.owner_id;
  if (!item || vendorOwner !== userId) return null;
  return item.id;
}

export default createHandler({
  PUT: method({
    auth: "user",
    handler: async ({ req, supabase, userId, body, res }) => {
      const itemId = req.query.id as string;
      if (!itemId) return res.status(400).json({ error: "Item ID required" });
      if (!(await ownedItemId(supabase, itemId, userId))) {
        return res.status(404).json({ error: "Item not found" });
      }

      const { name, description, price, currency, image_url, is_active, sort_order } = (body ?? {}) as Record<string, unknown>;

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
        .select(ITEM_COLUMNS)
        .maybeSingle();

      if (error) return sendInternalServerError(res, "Failed to update item", error);
      return res.status(200).json({ item: updated });
    },
  }),

  DELETE: method({
    auth: "user",
    handler: async ({ req, supabase, userId, res }) => {
      const itemId = req.query.id as string;
      if (!itemId) return res.status(400).json({ error: "Item ID required" });
      if (!(await ownedItemId(supabase, itemId, userId))) {
        return res.status(404).json({ error: "Item not found" });
      }

      const { error } = await supabase.from("vendor_items").delete().eq("id", itemId);
      if (error) return sendInternalServerError(res, "Failed to delete item", error);
      return res.status(200).json({ success: true });
    },
  }),
});
