import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerClient } from "@/lib/supabase-server";

async function resolveUserIdFromBearer(token: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { userId: null, error: "Supabase environment variables are missing" };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { userId: null, error: error?.message ?? "Invalid token" };
  }

  return { userId: data.user.id, error: null };
}

function parseBearer(req: NextApiRequest) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = parseBearer(req);
  if (!token) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  const { userId, error: userError } = await resolveUserIdFromBearer(token);
  if (userError || !userId) {
    return res.status(401).json({ error: userError ?? "Unauthorized" });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ error: "Supabase environment variables are missing" });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,phone,avatar_url,role,updated_at")
      .eq("id", userId)
      .single();

    if (error) return res.status(404).json({ error: error.message });

    return res.status(200).json({ profile: data });
  }

  if (req.method === "PUT") {
    const { full_name, phone } = req.body ?? {};

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: typeof full_name === "string" ? full_name : null,
          phone: typeof phone === "string" ? phone : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("id,full_name,phone,avatar_url,role,updated_at")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ profile: data });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
