import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

const ITEM_COLUMNS = "id,item_type,name,description,price,currency,image_url,sort_order,is_active,created_at";

function inferItemType(category: string): "menu" | "service" | "product" {
  const lower = category.toLowerCase();
  if (lower.includes("makan") || lower.includes("food") || lower.includes("kuliner") || lower.includes("minuman")) return "menu";
  if (lower.includes("jasa") || lower.includes("service") || lower.includes("konsultan") || lower.includes("layanan")) return "service";
  return "product";
}

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ supabase, userId, res }) => {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id,category")
        .eq("owner_id", userId)
        .maybeSingle();
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });

      const { data: items, error } = await supabase
        .from("vendor_items")
        .select(ITEM_COLUMNS)
        .eq("vendor_id", vendor.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) return sendInternalServerError(res, "Failed to load items", error);
      return res.status(200).json({ items: items ?? [], vendorCategory: vendor.category });
    },
  }),

  POST: method({
    auth: "user",
    handler: async ({ supabase, userId, body, res }) => {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id,category")
        .eq("owner_id", userId)
        .maybeSingle();
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });

      const { name, description, price, currency, image_url, item_type, sort_order } = (body ?? {}) as Record<string, unknown>;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Nama item wajib diisi." });
      }

      const numericPrice = typeof price === "number" ? price : parseFloat(String(price) || "0");
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ error: "Harga tidak valid." });
      }

      const validTypes = ["menu", "service", "product"] as const;
      const resolvedType = validTypes.includes(item_type as (typeof validTypes)[number])
        ? (item_type as (typeof validTypes)[number])
        : inferItemType(vendor.category ?? "");

      const { data: newItem, error } = await supabase
        .from("vendor_items")
        .insert({
          vendor_id: vendor.id,
          item_type: resolvedType,
          name: name.trim(),
          description: typeof description === "string" ? description.trim() || null : null,
          price: numericPrice,
          currency: typeof currency === "string" && currency.trim() ? currency.trim() : "IDR",
          image_url: typeof image_url === "string" ? image_url.trim() || null : null,
          sort_order: typeof sort_order === "number" ? sort_order : 0,
          is_active: true,
        })
        .select(ITEM_COLUMNS)
        .maybeSingle();

      if (error) return sendInternalServerError(res, "Failed to create item", error);
      return res.status(201).json({ item: newItem });
    },
  }),
});
