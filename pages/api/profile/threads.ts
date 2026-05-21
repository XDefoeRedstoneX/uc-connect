import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, "GET");

  const auth = await resolveAuthedUser(req);
  if (auth.status === 503) return sendServiceUnavailable(res);
  if (auth.status !== 200 || !auth.supabase || !auth.userId) {
    return res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
  }

  const { supabase, userId } = auth;

  const [threadsRes, repliesRes] = await Promise.all([
    supabase
      .from("forum_threads")
      .select("id,title,content,created_at,category_id,forum_categories:category_id(name,slug)")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("forum_replies")
      .select("id,thread_id,content,created_at,forum_threads:thread_id(id,title,category_id,forum_categories:category_id(slug))")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (threadsRes.error || repliesRes.error) {
    console.error("[api/profile/threads]", threadsRes.error ?? repliesRes.error);
    return sendInternalServerError(res, "Gagal memuat diskusi");
  }

  return res.status(200).json({ threads: threadsRes.data ?? [], replies: repliesRes.data ?? [] });
}
