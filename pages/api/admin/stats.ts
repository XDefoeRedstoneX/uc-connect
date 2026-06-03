import { createHandler, method } from "@/lib/api-handler";

export default createHandler({
  GET: method({
    auth: "admin",
    handler: async ({ supabase, res }) => {
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
    },
  }),
});
