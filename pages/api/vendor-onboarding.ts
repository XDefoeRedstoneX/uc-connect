import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const ALLOWED_DELIVERY = new Set(["cod-kampus", "digital-delivery", "lainnya"]);
const DELIVERY_LABELS: Record<string, string> = {
  "cod-kampus": "COD Kampus",
  "digital-delivery": "Digital Delivery",
  lainnya: "Lainnya",
};

export default createHandler({
  POST: method({
    auth: "user",
    handler: async ({ supabase, userId, body, res }) => {
      const b = (body ?? {}) as Record<string, unknown>;

      const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
      const university = typeof b.university === "string" ? b.university.trim() : "";
      const whatsappNumber = typeof b.whatsappNumber === "string" ? b.whatsappNumber.trim() : "";
      const businessName = typeof b.businessName === "string" ? b.businessName.trim() : "";
      const category = typeof b.category === "string" ? b.category.trim() : "";
      const description = typeof b.description === "string" ? b.description.trim() : "";
      const salesSystem = typeof b.salesSystem === "string" ? b.salesSystem.trim() : "";
      // Only accept known delivery-method keys — never persist arbitrary client
      // strings into vendors.delivery_methods (surfaced on the public profile).
      const deliveryMethod = Array.isArray(b.deliveryMethod)
        ? b.deliveryMethod.filter((item): item is string => typeof item === "string" && ALLOWED_DELIVERY.has(item))
        : [];
      const ktmUrl = typeof b.ktmUrl === "string" ? b.ktmUrl.trim() : null;
      const major = typeof b.major === "string" ? b.major.trim() : "";
      const graduationYearRaw = Number(b.graduationYear);
      const graduationYear = Number.isInteger(graduationYearRaw) ? graduationYearRaw : null;

      if (!fullName || !university || !whatsappNumber || !businessName || !category || !description || !salesSystem || deliveryMethod.length === 0) {
        return res.status(400).json({ error: "Data vendor belum lengkap" });
      }

      const profileResult = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: whatsappNumber,
          major: major || null,
          graduation_year: graduationYear,
          role: "vendor",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("id")
        .single();

      if (profileResult.error) return sendInternalServerError(res, "Unable to save vendor profile", profileResult.error);

      const existingVendorResult = await supabase
        .from("vendors")
        .select("id,slug,is_verified")
        .eq("owner_id", userId)
        .maybeSingle();

      if (existingVendorResult.error) return sendInternalServerError(res, "Unable to save vendor data", existingVendorResult.error);

      // Re-running onboarding for an already-approved vendor would reset
      // is_verified=false and null out dashboard-owned fields. Block it.
      if (existingVendorResult.data?.is_verified) {
        return res.status(409).json({
          error: "Vendor kamu sudah terverifikasi. Edit profil lewat dashboard, bukan onboarding ulang.",
        });
      }

      const deliveryText = deliveryMethod.map((item) => DELIVERY_LABELS[item] ?? item).join(", ");

      // Fields the onboarding form actually owns. On re-submit we update only
      // these and leave dashboard-owned fields (tagline/city/website/hero) alone.
      const onboardingFields = {
        name: businessName,
        category,
        description,
        whatsapp: whatsappNumber,
        university,
        sales_system: salesSystem,
        delivery_methods: deliveryText,
        ktm_url: ktmUrl,
        is_verified: false,
      };

      const vendorResult = existingVendorResult.data?.id
        ? await supabase.from("vendors").update(onboardingFields).eq("id", existingVendorResult.data.id).select("id").single()
        : await supabase
            .from("vendors")
            .insert({
              owner_id: userId,
              slug: `${slugify(businessName)}-${userId.slice(0, 8)}`,
              tagline: null,
              city: null,
              website_url: null,
              hero_image_url: null,
              ...onboardingFields,
            })
            .select("id")
            .single();

      if (vendorResult.error) return sendInternalServerError(res, "Unable to save vendor data", vendorResult.error);

      return res.status(200).json({ ok: true });
    },
  }),
});
