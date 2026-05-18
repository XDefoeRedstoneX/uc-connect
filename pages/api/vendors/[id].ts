import type { NextApiRequest, NextApiResponse } from "next";
import { sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return sendMethodNotAllowed(res, "GET");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return sendServiceUnavailable(res);
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid vendor id" });
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id,slug,name,tagline,category,city,is_verified,description,whatsapp,website_url,hero_image_url,created_at")
    .eq("id", id)
    .single();

  if (vendorError) {
    return res.status(404).json({ error: "Vendor not found" });
  }

  const [metricsResult, hoursResult, itemsResult] = await Promise.all([
    supabase
      .from("vendor_metrics")
      .select("vendor_id,sample_rating,response_rate,avg_reply_time,review_count,updated_at")
      .eq("vendor_id", id)
      .maybeSingle(),
    supabase
      .from("vendor_hours")
      .select("id,vendor_id,day_of_week,opens_at,closes_at,is_closed,notes")
      .eq("vendor_id", id)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("vendor_items")
      .select("id,vendor_id,item_type,name,description,price,currency,image_url,sort_order,is_active,created_at")
      .eq("vendor_id", id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (metricsResult.error) {
    return res.status(500).json({ error: "Unable to load vendor metrics" });
  }

  if (hoursResult.error) {
    return res.status(500).json({ error: "Unable to load vendor hours" });
  }

  if (itemsResult.error) {
    return res.status(500).json({ error: "Unable to load vendor items" });
  }

  return res.status(200).json({
    vendor: {
      ...vendor,
      metrics: metricsResult.data ?? null,
      hours: hoursResult.data ?? [],
      items: itemsResult.data ?? [],
    },
  });
}
