import type { NextApiRequest, NextApiResponse } from "next";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";
import { resolveAuthedUser } from "@/lib/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return sendMethodNotAllowed(res, "GET");
  }

  const authContext = await resolveAuthedUser(req);
  if (authContext.status === 503) {
    return sendServiceUnavailable(res);
  }
  if (authContext.status !== 200 || !authContext.supabase || !authContext.userId) {
    return res.status(authContext.status).json({ error: authContext.error ?? "Unauthorized" });
  }

  const { supabase, userId } = authContext;

  // Get vendor data for current user
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select(
      "id,slug,name,tagline,category,city,is_verified,description,whatsapp,website_url,hero_image_url,created_at",
    )
    .eq("owner_id", userId)
    .maybeSingle();

  if (vendorError) {
    console.error("[api/vendor-dashboard] failed to fetch vendor", vendorError);
    return sendInternalServerError(res, "Unable to load vendor data");
  }

  if (!vendor) {
    return res.status(404).json({ error: "Vendor not found" });
  }

  // Get vendor metrics, items, and hours in parallel
  const [metricsResult, itemsResult, hoursResult] = await Promise.all([
    supabase
      .from("vendor_metrics")
      .select("vendor_id,sample_rating,response_rate,avg_reply_time,review_count,updated_at")
      .eq("vendor_id", vendor.id)
      .maybeSingle(),
    supabase
      .from("vendor_items")
      .select("id,name,price,is_active")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("vendor_hours")
      .select("id,day_of_week,opens_at,closes_at,is_closed")
      .eq("vendor_id", vendor.id)
      .order("day_of_week", { ascending: true }),
  ]);

  if (metricsResult.error) {
    console.error("[api/vendor-dashboard] failed to fetch metrics", metricsResult.error);
  }

  if (itemsResult.error) {
    console.error("[api/vendor-dashboard] failed to fetch items", itemsResult.error);
  }

  if (hoursResult.error) {
    console.error("[api/vendor-dashboard] failed to fetch hours", hoursResult.error);
  }

  return res.status(200).json({
    vendor: {
      ...vendor,
      metrics: metricsResult.data ?? null,
      items: itemsResult.data ?? [],
      itemCount: itemsResult.data?.length ?? 0,
      hours: hoursResult.data ?? [],
    },
  });
}
