import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";

const ALLOWED_CATEGORIES = ["Makanan & Minuman", "Jasa & Layanan", "Fashion", "Kreatif & Desain", "Elektronik", "Kesehatan & Kecantikan", "Lainnya"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authContext = await resolveAuthedUser(req);
  if (authContext.status === 503) return sendServiceUnavailable(res);
  if (authContext.status !== 200 || !authContext.supabase || !authContext.userId) {
    return res.status(authContext.status).json({ error: authContext.error ?? "Unauthorized" });
  }
  const { supabase, userId } = authContext;

  // GET — fetch vendor profile for current user
  if (req.method === "GET") {
    const { data: vendor, error } = await supabase
      .from("vendors")
      .select("id,slug,name,tagline,category,city,address,description,whatsapp,website_url,hero_image_url,logo_url,is_verified,whatsapp_clicks,university,sales_system,delivery_methods,created_at,updated_at")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) return sendInternalServerError(res, "Failed to load vendor");
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    // Fetch hours
    const { data: hours } = await supabase
      .from("vendor_hours")
      .select("id,day_of_week,opens_at,closes_at,is_closed,notes")
      .eq("vendor_id", vendor.id)
      .order("day_of_week", { ascending: true });

    return res.status(200).json({ vendor: { ...vendor, hours: hours ?? [] } });
  }

  // PUT — update vendor profile
  if (req.method === "PUT") {
    const { data: existing } = await supabase
      .from("vendors")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: "Vendor not found" });

    const {
      name, tagline, category, city, address, description,
      whatsapp, website_url, hero_image_url, logo_url,
      university, sales_system, delivery_methods,
    } = req.body as Record<string, string>;

    if (!name?.trim()) return res.status(400).json({ error: "Nama bisnis wajib diisi." });

    const updates: Record<string, unknown> = {
      name: name.trim(),
      tagline: tagline?.trim() || null,
      category: category?.trim() || null,
      city: city?.trim() || null,
      address: address?.trim() || null,
      description: description?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      website_url: website_url?.trim() || null,
      university: university?.trim() || null,
      sales_system: sales_system?.trim() || null,
      delivery_methods: delivery_methods?.trim() || null,
    };

    if (hero_image_url !== undefined) {
      updates.hero_image_url = hero_image_url || null;
    }
    if (logo_url !== undefined) {
      updates.logo_url = logo_url || null;
    }

    const { data: updated, error: updateError } = await supabase
      .from("vendors")
      .update(updates)
      .eq("id", existing.id)
      .select("id,slug,name,tagline,category,city,address,description,whatsapp,website_url,hero_image_url,logo_url,is_verified,whatsapp_clicks,university,sales_system,delivery_methods")
      .maybeSingle();

    if (updateError) {
      console.error("[api/vendor/profile PUT]", updateError);
      return sendInternalServerError(res, "Failed to update vendor profile");
    }

    return res.status(200).json({ vendor: updated });
  }

  return sendMethodNotAllowed(res, "GET, PUT");
}
