import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await resolveAuthedUser(req);
  if (auth.status === 503) return sendServiceUnavailable(res);
  if (auth.status !== 200 || !auth.supabase || !auth.userId) {
    return res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
  }

  const { supabase, userId } = auth;

  if (req.method === "GET") {
    const onlyUnread = req.query.unread === "1";
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);

    let query = supabase
      .from("notifications")
      .select("id,user_id,type,payload,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (onlyUnread) query = query.is("read_at", null);

    const { data, error } = await query;
    if (error) {
      console.error("[api/notifications GET]", error);
      return sendInternalServerError(res, "Gagal memuat notifikasi");
    }

    const { count: unread } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    return res.status(200).json({ notifications: data ?? [], unread_count: unread ?? 0 });
  }

  if (req.method === "PATCH") {
    const { id, all } = req.body as { id?: string; all?: boolean };
    const now = new Date().toISOString();

    if (all) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) {
        console.error("[api/notifications PATCH all]", error);
        return sendInternalServerError(res, "Gagal menandai notifikasi");
      }
      return res.status(200).json({ success: true });
    }

    if (!id) return res.status(400).json({ error: "id atau all wajib" });

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      console.error("[api/notifications PATCH one]", error);
      return sendInternalServerError(res, "Gagal menandai notifikasi");
    }
    return res.status(200).json({ success: true });
  }

  return sendMethodNotAllowed(res, "GET, PATCH");
}
