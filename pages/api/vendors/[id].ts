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
