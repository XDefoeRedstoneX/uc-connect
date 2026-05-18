import type { NextApiRequest, NextApiResponse } from "next";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";
import { resolveAuthedUser } from "@/lib/api-auth";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return sendMethodNotAllowed(res, "POST");
  }

  const authContext = await resolveAuthedUser(req);
  if (authContext.status === 503) {
    return sendServiceUnavailable(res);
  }
  if (authContext.status !== 200 || !authContext.supabase || !authContext.userId) {
    return res.status(authContext.status).json({ error: authContext.error ?? "Unauthorized" });
  }

  const { supabase, userId } = authContext;
  const body = (req.body ?? {}) as Record<string, unknown>;

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const university = typeof body.university === "string" ? body.university.trim() : "";
  const whatsappNumber = typeof body.whatsappNumber === "string" ? body.whatsappNumber.trim() : "";
  const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const salesSystem = typeof body.salesSystem === "string" ? body.salesSystem.trim() : "";
  const deliveryMethod = Array.isArray(body.deliveryMethod)
    ? body.deliveryMethod.filter((item): item is string => typeof item === "string")
    : [];
  const ktmUrl = typeof body.ktmUrl === "string" ? body.ktmUrl.trim() : null;

  if (!fullName || !university || !whatsappNumber || !businessName || !category || !description || !salesSystem || deliveryMethod.length === 0) {
    return res.status(400).json({ error: "Data vendor belum lengkap" });
  }

  const profileResult = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: whatsappNumber,
      role: "vendor",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .single();

  if (profileResult.error) {
    console.error("[api/vendor-onboarding] failed to update profile", profileResult.error);
    return sendInternalServerError(res, "Unable to save vendor profile");
  }

  const existingVendorResult = await supabase
    .from("vendors")
    .select("id,slug")
    .eq("owner_id", userId)
    .maybeSingle();

  if (existingVendorResult.error) {
    console.error("[api/vendor-onboarding] failed to find existing vendor", existingVendorResult.error);
    return sendInternalServerError(res, "Unable to save vendor data");
  }

  const deliveryText = deliveryMethod
    .map((item) => (item === "cod-kampus" ? "COD Kampus" : "Digital Delivery"))
    .join(", ");

  const vendorPayload = {
    owner_id: userId,
    slug: existingVendorResult.data?.slug ?? `${slugify(businessName)}-${userId.slice(0, 8)}`,
    name: businessName,
    tagline: `${university} • ${salesSystem === "ready-stock" ? "Ready Stock" : "Pre-Order"}`,
    category,
    city: university,
    description,
    whatsapp: whatsappNumber,
    university,
    sales_system: salesSystem,
    delivery_methods: deliveryText,
    ktm_url: ktmUrl,
    website_url: null,
    hero_image_url: null,
    is_verified: false,
  };

  const vendorResult = existingVendorResult.data?.id
    ? await supabase.from("vendors").update(vendorPayload).eq("id", existingVendorResult.data.id).select("id").single()
    : await supabase.from("vendors").insert(vendorPayload).select("id").single();

  if (vendorResult.error) {
    console.error("[api/vendor-onboarding] failed to save vendor", vendorResult.error);
    return sendInternalServerError(res, "Unable to save vendor data");
  }

  return res.status(200).json({ ok: true });
}
