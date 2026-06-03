import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ req, supabase, userId, res }) => {
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
      if (error) return sendInternalServerError(res, "Gagal memuat notifikasi", error);

      const { count: unread } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);

      return res.status(200).json({ notifications: data ?? [], unread_count: unread ?? 0 });
    },
  }),

  PATCH: method({
    auth: "user",
    handler: async ({ supabase, userId, body, res }) => {
      const { id, all } = (body ?? {}) as { id?: string; all?: boolean };
      const now = new Date().toISOString();

      if (all) {
        const { error } = await supabase
          .from("notifications")
          .update({ read_at: now })
          .eq("user_id", userId)
          .is("read_at", null);
        if (error) return sendInternalServerError(res, "Gagal menandai notifikasi", error);
        return res.status(200).json({ success: true });
      }

      if (!id) return res.status(400).json({ error: "id atau all wajib" });

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return sendInternalServerError(res, "Gagal menandai notifikasi", error);
      return res.status(200).json({ success: true });
    },
  }),
});
