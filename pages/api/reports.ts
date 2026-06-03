import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError } from "@/lib/api-response";
import { z } from "@/lib/validation";
import type { ReportTargetType } from "@/types/domain";

const reportSchema = z.object({
  target_type: z.enum(["vendor", "review", "thread", "reply"], { message: "target_type tidak valid" }),
  target_id: z.string().trim().min(1, "target_id wajib diisi"),
  reason: z.string().trim().min(5, "Alasan minimal 5 karakter"),
});

const targetTable: Record<ReportTargetType, string> = {
  vendor: "vendors",
  review: "vendor_reviews",
  thread: "forum_threads",
  reply: "forum_replies",
};

export default createHandler({
  POST: method({
    auth: "user",
    rateLimit: { key: "report", limit: 10, windowMs: 60_000 },
    body: reportSchema,
    handler: async ({ supabase, userId, body, res }) => {
      const { target_type, target_id, reason } = body;

      // Verify the target row actually exists — otherwise admins get reports
      // pointing at deleted/never-existing rows that they can't action.
      const { data: targetRow, error: targetErr } = await supabase
        .from(targetTable[target_type])
        .select("id")
        .eq("id", target_id)
        .maybeSingle();
      if (targetErr) return sendInternalServerError(res, "Gagal memverifikasi target laporan", targetErr);
      if (!targetRow) {
        return res.status(404).json({ error: "Konten yang dilaporkan tidak ditemukan" });
      }

      // Dedup across ALL statuses (open/resolved/dismissed) within the last 30
      // days, so a resolved/dismissed report can't be used to spam a re-report.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("reports")
        .select("id")
        .eq("reporter_id", userId)
        .eq("target_type", target_type)
        .eq("target_id", target_id)
        .gte("created_at", thirtyDaysAgo)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: "Kamu sudah melaporkan konten ini dalam 30 hari terakhir." });
      }

      const { data, error } = await supabase
        .from("reports")
        .insert({
          target_type,
          target_id,
          reporter_id: userId,
          reason: reason.slice(0, 500),
        })
        .select("id,target_type,target_id,reason,status,created_at")
        .single();

      if (error) return sendInternalServerError(res, "Gagal mengirim laporan", error);

      return res.status(201).json({ report: data });
    },
  }),
});
