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

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id,category")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!vendor) return res.status(404).json({ error: "Vendor not found" });

  if (req.method === "GET") {
    const { data: items, error } = await supabase
      .from("vendor_items")
      .select("id,item_type,name,description,price,currency,image_url,sort_order,is_active,created_at")
      .eq("vendor_id", vendor.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return sendInternalServerError(res, "Failed to load items");
    return res.status(200).json({ items: items ?? [], vendorCategory: vendor.category });
  }

  if (req.method === "POST") {
    const { name, description, price, currency, image_url, item_type, sort_order } = req.body as Record<string, unknown>;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Nama item wajib diisi." });
    }

    const numericPrice = typeof price === "number" ? price : parseFloat(String(price) || "0");
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: "Harga tidak valid." });
    }

    const validTypes = ["menu", "service", "product"] as const;
    const resolvedType = validTypes.includes(item_type as typeof validTypes[number])
      ? (item_type as typeof validTypes[number])
      : inferItemType(vendor.category ?? "");

    const { data: newItem, error } = await supabase
      .from("vendor_items")
      .insert({
        vendor_id: vendor.id,
        item_type: resolvedType,
        name: (name as string).trim(),
        description: typeof description === "string" ? description.trim() || null : null,
        price: numericPrice,
        currency: typeof currency === "string" && currency.trim() ? currency.trim() : "IDR",
        image_url: typeof image_url === "string" ? image_url.trim() || null : null,
        sort_order: typeof sort_order === "number" ? sort_order : 0,
        is_active: true,
      })
      .select("id,item_type,name,description,price,currency,image_url,sort_order,is_active,created_at")
      .maybeSingle();

    if (error) {
      console.error("[api/vendor/items POST]", error);
      return sendInternalServerError(res, "Failed to create item");
    }

    return res.status(201).json({ item: newItem });
  }

  return sendMethodNotAllowed(res, "GET, POST");
}

function inferItemType(category: string): "menu" | "service" | "product" {
  const lower = category.toLowerCase();
  if (lower.includes("makan") || lower.includes("food") || lower.includes("kuliner") || lower.includes("minuman")) return "menu";
  if (lower.includes("jasa") || lower.includes("service") || lower.includes("konsultan") || lower.includes("layanan")) return "service";
  return "product";
}
