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

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid vendor id" });
  }

  const { data, error } = await supabase
    .from("vendors")
    .select("id,name,category,city,is_verified,description,whatsapp,created_at")
    .eq("id", id)
    .single();

  if (error) {
    return res.status(404).json({ error: "Vendor not found" });
  }

  return res.status(200).json({ vendor: data });
}
