import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAuthedUser } from "@/lib/api-auth";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";
import type { ReportTargetType } from "@/types/domain";
import { rateLimited } from "@/lib/rate-limit";

const VALID_TYPES: ReportTargetType[] = ["vendor", "review", "thread", "reply"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, "POST");

  const auth = await resolveAuthedUser(req);
  if (auth.status === 503) return sendServiceUnavailable(res);
  if (auth.status !== 200 || !auth.supabase || !auth.userId) {
    return res.status(auth.status).json({ error: auth.error ?? "Unauthorized" });
  }

  const { supabase, userId } = auth;
  if (rateLimited(res, `report:${userId}`, { limit: 10, windowMs: 60_000 })) return;

  const { target_type, target_id, reason } = req.body as {
    target_type?: string;
    target_id?: string;
    reason?: string;
  };

  if (!target_type || !VALID_TYPES.includes(target_type as ReportTargetType)) {
    return res.status(400).json({ error: "target_type tidak valid" });
  }
  if (!target_id) return res.status(400).json({ error: "target_id wajib diisi" });
  const trimmedReason = (reason ?? "").trim();
  if (!trimmedReason || trimmedReason.length < 5) {
    return res.status(400).json({ error: "Alasan minimal 5 karakter" });
  }

  // Verify the target row actually exists — otherwise admins get reports
  // pointing at deleted/never-existing rows that they can't action.
  const targetTable: Record<ReportTargetType, string> = {
    vendor: "vendors",
    review: "vendor_reviews",
    thread: "forum_threads",
    reply: "forum_replies",
  };
  const { data: targetRow, error: targetErr } = await supabase
    .from(targetTable[target_type as ReportTargetType])
    .select("id")
    .eq("id", target_id)
    .maybeSingle();
  if (targetErr) {
    console.error("[api/reports] target lookup", targetErr);
    return sendInternalServerError(res, "Gagal memverifikasi target laporan");
  }
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
      reason: trimmedReason.slice(0, 500),
    })
    .select("id,target_type,target_id,reason,status,created_at")
    .single();

  if (error) {
    console.error("[api/reports POST]", error);
    return sendInternalServerError(res, "Gagal mengirim laporan");
  }

  return res.status(201).json({ report: data });
}
