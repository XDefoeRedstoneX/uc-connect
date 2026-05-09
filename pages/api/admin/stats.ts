import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendMethodNotAllowed, sendInternalServerError } from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, "GET");

  const ctx = await requireAdmin(req, res);
  if (!ctx) return; // response already sent

  const { supabase } = ctx;

  const [usersRes, vendorsRes, threadsRes, repliesRes, pendingRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("vendors").select("id", { count: "exact", head: true }),
    supabase.from("forum_threads").select("id", { count: "exact", head: true }),
    supabase.from("forum_replies").select("id", { count: "exact", head: true }),
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_verified", false),
  ]);

  return res.status(200).json({
    stats: {
      totalUsers: usersRes.count ?? 0,
      totalVendors: vendorsRes.count ?? 0,
      pendingVendors: pendingRes.count ?? 0,
      totalThreads: threadsRes.count ?? 0,
      totalReplies: repliesRes.count ?? 0,
    },
  });
}
