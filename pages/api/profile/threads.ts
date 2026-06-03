import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ supabase, userId, res }) => {
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
        return sendInternalServerError(res, "Gagal memuat diskusi", threadsRes.error ?? repliesRes.error);
      }

      return res.status(200).json({ threads: threadsRes.data ?? [], replies: repliesRes.data ?? [] });
    },
  }),
});
