import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendInternalServerError, sendMethodNotAllowed } from "@/lib/api-response";

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

  const { error } = await supabase.auth.admin.deleteUser(targetId);
  if (error) {
    console.error("[api/admin/users/[id] DELETE]", error);
    return sendInternalServerError(res, "Gagal menghapus akun");
  }
  return res.status(200).json({ success: true });
}
