import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ error: "Supabase environment variables are missing" });
  }

  const { q = "", category = "" } = req.query;

  let query = supabase
    .from("vendors")
    .select("id,name,category,city,is_verified,description,whatsapp,created_at")
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
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ vendors: data ?? [] });
}
