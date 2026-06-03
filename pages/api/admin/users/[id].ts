import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { log } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return sendMethodNotAllowed(res, "DELETE");

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase, userId: adminId } = ctx;

  const targetId = req.query.id as string;
  if (!targetId) return res.status(400).json({ error: "user id wajib" });

  if (targetId === adminId) {
    return res.status(400).json({ error: "Admin tidak bisa menghapus akunnya sendiri di sini. Gunakan halaman profil." });
  }

  // Refuse admin-on-admin deletion. Demoting via the role-management UI must
  // happen first, otherwise one admin could quietly remove another.
  const { data: targetProfile, error: roleErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();
  if (roleErr) {
    console.error("[api/admin/users/[id] DELETE] role lookup", roleErr);
    return sendInternalServerError(res, "Gagal memuat target");
  }
  if (targetProfile?.role === "admin") {
    log.warn("admin_delete_admin_blocked", { adminId, targetId });
    return res.status(403).json({ error: "Admin tidak bisa menghapus admin lain. Demosi role dulu via dashboard." });
  }

  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) return sendServiceUnavailable(res);

  log.warn("admin_user_delete", { adminId, targetId });
  const { error } = await serviceClient.auth.admin.deleteUser(targetId);
  if (error) {
    console.error("[api/admin/users/[id] DELETE]", error);
    return sendInternalServerError(res, "Gagal menghapus akun");
  }
  return res.status(200).json({ success: true });
}
