import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

export default createHandler({
  GET: method({
    auth: "admin",
    handler: async ({ req, supabase, res }) => {
      const type = req.query.type as string | undefined; // "threads" | "replies"

      if (type === "replies") {
        const { data, error } = await supabase
          .from("forum_replies")
          .select("id,thread_id,author_id,content,created_at,profiles!forum_replies_author_id_fkey(username,full_name)")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) return sendInternalServerError(res, "Failed to load replies", error);
        return res.status(200).json({ replies: data ?? [] });
      }

      const { data, error } = await supabase
        .from("forum_threads")
        .select("id,category_id,author_id,title,content,view_count,created_at,profiles!forum_threads_author_id_fkey(username,full_name),forum_categories!inner(name,slug)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return sendInternalServerError(res, "Failed to load threads", error);
      return res.status(200).json({ threads: data ?? [] });
    },
  }),

  // DELETE — remove a thread or reply. The `content_removed` notification is
  // inserted here (post-delete) instead of via a DB trigger, so the service-role
  // admin path and the browser-admin path both fire it. An author deleting their
  // own row doesn't notify themselves (skipped when authorId === adminId).
  DELETE: method({
    auth: "admin",
    handler: async ({ supabase, userId: adminId, body, res }) => {
      const { type, id } = (body ?? {}) as { type?: "thread" | "reply"; id?: string };
      if (!type || !id) return res.status(400).json({ error: "type and id required" });

      if (type === "thread") {
        const { data: existing } = await supabase.from("forum_threads").select("author_id,title").eq("id", id).maybeSingle();
        const { error } = await supabase.from("forum_threads").delete().eq("id", id);
        if (error) return sendInternalServerError(res, "Failed to delete thread", error);
        if (existing?.author_id && existing.author_id !== adminId) {
          await supabase.from("notifications").insert({
            user_id: existing.author_id,
            type: "content_removed",
            payload: { target_type: "thread", preview: (existing.title ?? "").slice(0, 140) },
          });
        }
      } else {
        const { data: existing } = await supabase.from("forum_replies").select("author_id,content").eq("id", id).maybeSingle();
        const { error } = await supabase.from("forum_replies").delete().eq("id", id);
        if (error) return sendInternalServerError(res, "Failed to delete reply", error);
        if (existing?.author_id && existing.author_id !== adminId) {
          await supabase.from("notifications").insert({
            user_id: existing.author_id,
            type: "content_removed",
            payload: { target_type: "reply", preview: (existing.content ?? "").slice(0, 140) },
          });
        }
      }

      return res.status(200).json({ success: true });
    },
  }),
});
