import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

const VENDOR_COLUMNS =
  "id,slug,name,tagline,category,city,address,description,whatsapp,website_url,hero_image_url,logo_url,is_verified,whatsapp_clicks,university,sales_system,delivery_methods,created_at,updated_at";

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ supabase, userId, res }) => {
      const { data: vendor, error } = await supabase
        .from("vendors")
        .select(VENDOR_COLUMNS)
        .eq("owner_id", userId)
        .maybeSingle();

      if (error) return sendInternalServerError(res, "Failed to load vendor", error);
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });

      const { data: hours } = await supabase
        .from("vendor_hours")
        .select("id,day_of_week,opens_at,closes_at,is_closed,notes")
        .eq("vendor_id", vendor.id)
        .order("day_of_week", { ascending: true });

      return res.status(200).json({ vendor: { ...vendor, hours: hours ?? [] } });
    },
  }),

  PUT: method({
    auth: "user",
    handler: async ({ supabase, userId, body, res }) => {
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
      } = (body ?? {}) as Record<string, string | undefined>;

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

      if (hero_image_url !== undefined) updates.hero_image_url = hero_image_url || null;
      if (logo_url !== undefined) updates.logo_url = logo_url || null;

      const { data: updated, error: updateError } = await supabase
        .from("vendors")
        .update(updates)
        .eq("id", existing.id)
        .select("id,slug,name,tagline,category,city,address,description,whatsapp,website_url,hero_image_url,logo_url,is_verified,whatsapp_clicks,university,sales_system,delivery_methods")
        .maybeSingle();

      if (updateError) return sendInternalServerError(res, "Failed to update vendor profile", updateError);
      return res.status(200).json({ vendor: updated });
    },
  }),
});
