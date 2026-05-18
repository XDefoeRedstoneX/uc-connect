import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import { sendMethodNotAllowed, sendServiceUnavailable, sendInternalServerError } from "@/lib/api-response";

/** Middleware: verifies the user is an admin. Returns userId or sends error. */
export async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const auth = await resolveAuthedUser(req);
  if (auth.status === 503) { sendServiceUnavailable(res); return null; }
  if (auth.status !== 200 || !auth.supabase || !auth.userId) {
    res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
    return null;
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.userId)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return null;
  }

  return { supabase: auth.supabase, userId: auth.userId };
}
