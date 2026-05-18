import type { NextApiRequest } from "next";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export function readBearerToken(req: NextApiRequest) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}

export async function resolveAuthedUser(req: NextApiRequest) {
  const token = readBearerToken(req);
  if (!token) {
    return { status: 401 as const, error: "Missing Bearer token", supabase: null, userId: null, user: null };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { status: 503 as const, error: "Service temporarily unavailable", supabase: null, userId: null, user: null };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { status: 401 as const, error: "Unauthorized", supabase: null, userId: null, user: null };
  }

  return { status: 200 as const, error: null, supabase, userId: userData.user.id, user: userData.user };
}
