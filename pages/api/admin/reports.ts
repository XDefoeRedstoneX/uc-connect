import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendInternalServerError, sendMethodNotAllowed } from "@/lib/api-response";
import { log } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase, userId } = ctx;

  if (req.method === "GET") {
    const status = (req.query.status as string | undefined) ?? "open";

    let query = supabase
      .from("reports")
      .select("id,target_type,target_id,reporter_id,reason,status,resolved_by,resolved_at,created_at,reporter:reporter_id(full_name,username)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      console.error("[api/admin/reports GET]", error);
      return sendInternalServerError(res, "Gagal memuat laporan");
    }

    // Enrich each report with a target_url + target_preview so admins can
    // jump straight to the offending row instead of hunting through the
    // moderation lists. Batched per target_type to keep this O(1) extra calls.
    type ReportRow = {
      id: string;
      target_type: "vendor" | "review" | "thread" | "reply";
      target_id: string;
      [key: string]: unknown;
    };
    const rows = (data ?? []) as ReportRow[];
    const ids = (t: ReportRow["target_type"]) =>
      Array.from(new Set(rows.filter((r) => r.target_type === t).map((r) => r.target_id)));

    const [vendorRows, reviewRows, threadRows, replyRows] = await Promise.all([
      ids("vendor").length
        ? supabase.from("vendors").select("id,name").in("id", ids("vendor"))
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ids("review").length
        ? supabase.from("vendor_reviews").select("id,vendor_id,content").in("id", ids("review"))
        : Promise.resolve({ data: [] as { id: string; vendor_id: string; content: string | null }[] }),
      ids("thread").length
        ? supabase
            .from("forum_threads")
            .select("id,title,forum_categories!inner(slug)")
            .in("id", ids("thread"))
        : Promise.resolve({ data: [] as { id: string; title: string; forum_categories: { slug: string } | null }[] }),
      ids("reply").length
        ? supabase
            .from("forum_replies")
            .select("id,thread_id,content,forum_threads!inner(id,forum_categories!inner(slug))")
            .in("id", ids("reply"))
        : Promise.resolve({ data: [] as { id: string; thread_id: string; content: string | null; forum_threads: { id: string; forum_categories: { slug: string } | null } | null }[] }),
    ]);

    // PostgREST types nested selects as union | array | object; normalize once
    // so the lookups below don't need defensive Array.isArray checks.
    type VendorLite = { id: string; name: string };
    type ReviewLite = { id: string; vendor_id: string; content: string | null };
    type ThreadLite = { id: string; title: string; slug: string | null };
    type ReplyLite = { id: string; thread_id: string; content: string | null; slug: string | null; resolved_thread_id: string | null };

    const firstSlug = (cat: unknown): string | null => {
      if (Array.isArray(cat)) return (cat[0] as { slug?: string } | undefined)?.slug ?? null;
      return (cat as { slug?: string } | null)?.slug ?? null;
    };
    const firstThread = (t: unknown): { id?: string; forum_categories?: unknown } | null => {
      if (Array.isArray(t)) return (t[0] as { id?: string; forum_categories?: unknown } | undefined) ?? null;
      return (t as { id?: string; forum_categories?: unknown } | null) ?? null;
    };

    const vendorById = new Map<string, VendorLite>(
      (vendorRows.data ?? []).map((v) => [v.id, { id: v.id, name: v.name }]),
    );
    const reviewById = new Map<string, ReviewLite>(
      (reviewRows.data ?? []).map((r) => [r.id, { id: r.id, vendor_id: r.vendor_id, content: r.content }]),
    );
    const threadById = new Map<string, ThreadLite>(
      (threadRows.data ?? []).map((t) => [t.id, { id: t.id, title: t.title, slug: firstSlug(t.forum_categories) }]),
    );
    const replyById = new Map<string, ReplyLite>(
      (replyRows.data ?? []).map((rp) => {
        const thread = firstThread(rp.forum_threads);
        return [
          rp.id,
          {
            id: rp.id,
            thread_id: rp.thread_id,
            content: rp.content,
            slug: firstSlug(thread?.forum_categories),
            resolved_thread_id: thread?.id ?? rp.thread_id ?? null,
          },
        ];
      }),
    );

    const enriched = rows.map((r) => {
      let target_url: string | null = null;
      let target_preview: string | null = null;
      let target_exists = false;
      if (r.target_type === "vendor") {
        const v = vendorById.get(r.target_id);
        if (v) {
          target_url = `/directory/vendor/${v.id}`;
          target_preview = v.name;
          target_exists = true;
        }
      } else if (r.target_type === "review") {
        const rev = reviewById.get(r.target_id);
        if (rev) {
          target_url = `/directory/vendor/${rev.vendor_id}`;
          target_preview = (rev.content ?? "").slice(0, 140);
          target_exists = true;
        }
      } else if (r.target_type === "thread") {
        const t = threadById.get(r.target_id);
        if (t && t.slug) {
          target_url = `/community/${t.slug}/${t.id}`;
          target_preview = t.title;
          target_exists = true;
        }
      } else if (r.target_type === "reply") {
        const rp = replyById.get(r.target_id);
        if (rp && rp.slug && rp.resolved_thread_id) {
          target_url = `/community/${rp.slug}/${rp.resolved_thread_id}`;
          target_preview = (rp.content ?? "").slice(0, 140);
          target_exists = true;
        }
      }
      return { ...r, target_url, target_preview, target_exists };
    });

    return res.status(200).json({ reports: enriched });
  }

  if (req.method === "PATCH") {
    const { report_id, status } = req.body as { report_id?: string; status?: "resolved" | "dismissed" };
    if (!report_id || !status || !["resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "report_id dan status wajib (resolved|dismissed)" });
    }

    const { error } = await supabase
      .from("reports")
      .update({ status, resolved_by: userId, resolved_at: new Date().toISOString() })
      .eq("id", report_id);

    if (error) {
      console.error("[api/admin/reports PATCH]", error);
      log.error("admin_report_status_change_failed", { adminId: userId, reportId: report_id, status, message: error.message });
      return sendInternalServerError(res, "Gagal memperbarui status laporan");
    }
    log.info("admin_report_status_change", { adminId: userId, reportId: report_id, status });
    return res.status(200).json({ success: true });
  }

  if (req.method === "DELETE") {
    const { report_id } = req.body as { report_id?: string };
    if (!report_id) return res.status(400).json({ error: "report_id wajib" });

    const { error } = await supabase.from("reports").delete().eq("id", report_id);
    if (error) {
      console.error("[api/admin/reports DELETE]", error);
      log.error("admin_report_delete_failed", { adminId: userId, reportId: report_id, message: error.message });
      return sendInternalServerError(res, "Gagal menghapus laporan");
    }
    log.warn("admin_report_delete", { adminId: userId, reportId: report_id });
    return res.status(200).json({ success: true });
  }

  return sendMethodNotAllowed(res, "GET, PATCH, DELETE");
}
