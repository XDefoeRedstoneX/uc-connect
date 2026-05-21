import type { NextApiRequest, NextApiResponse } from "next";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return sendMethodNotAllowed(res, "GET");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return sendServiceUnavailable(res);
  }

  const { q = "", category = "" } = req.query;

  let query = supabase
    .from("vendors")
    .select("id,slug,name,tagline,category,city,is_verified,description,whatsapp,website_url,hero_image_url,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (typeof q === "string" && q.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
  }

  if (typeof category === "string" && category.trim()) {
    query = query.eq("category", category.trim());
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/vendors] query failed", error);
    return sendInternalServerError(res, "Unable to load vendors");
  }

  // Currently-featured vendors (paid auction winners with an active 24h window),
  // ordered by rank. Used to pin them at the top of Explore.
  const { data: slots } = await supabase
    .from("featured_slots")
    .select("vendor_id,rank,ends_at")
    .gt("ends_at", new Date().toISOString())
    .order("rank", { ascending: true });

  const featuredIds = (slots ?? []).map((s) => s.vendor_id);
  let featured: typeof data = [];
  if (featuredIds.length > 0) {
    const { data: featuredVendors } = await supabase
      .from("vendors")
      .select("id,slug,name,tagline,category,city,is_verified,description,whatsapp,website_url,hero_image_url,created_at")
      .in("id", featuredIds)
      .eq("is_verified", true);
    // Preserve rank ordering.
    const byId = new Map((featuredVendors ?? []).map((v) => [v.id, v]));
    featured = featuredIds.map((id) => byId.get(id)).filter(Boolean) as typeof data;
  }

  return res.status(200).json({ vendors: data ?? [], featured });
}
