import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendInternalServerError, sendMethodNotAllowed } from "@/lib/api-response";

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
    return res.status(200).json({ reports: data ?? [] });
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
      return sendInternalServerError(res, "Gagal memperbarui status laporan");
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === "DELETE") {
    const { report_id } = req.body as { report_id?: string };
    if (!report_id) return res.status(400).json({ error: "report_id wajib" });

    const { error } = await supabase.from("reports").delete().eq("id", report_id);
    if (error) {
      console.error("[api/admin/reports DELETE]", error);
      return sendInternalServerError(res, "Gagal menghapus laporan");
    }
    return res.status(200).json({ success: true });
  }

  return sendMethodNotAllowed(res, "GET, PATCH, DELETE");
}
