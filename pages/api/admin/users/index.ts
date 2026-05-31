import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendMethodNotAllowed, sendInternalServerError } from "@/lib/api-response";
import { log } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase, userId: adminId } = ctx;

  if (req.method === "GET") {
    const role = req.query.role as string | undefined;
    let query = supabase
      .from("profiles")
      .select("id,username,full_name,phone,avatar_url,role,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (role && ["customer", "vendor", "admin"].includes(role)) {
      query = query.eq("role", role);
    }

    const { data, error } = await query;
    if (error) return sendInternalServerError(res, "Failed to load users");
    return res.status(200).json({ users: data ?? [] });
  }

  if (req.method === "PATCH") {
    const { user_id, role } = req.body as { user_id?: string; role?: string };
    if (!user_id || !role) return res.status(400).json({ error: "user_id and role required" });
    if (!["customer", "vendor", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Block self-demotion: if the only remaining admin demotes themselves we
    // lock the dashboard out. Even when other admins exist, an accidental
    // self-demote via the dropdown is too easy to do — force them through
    // another admin or the DB.
    if (user_id === adminId) {
      log.warn("admin_self_role_change_blocked", { adminId, attemptedRole: role });
      return res.status(403).json({
        error: "Admin tidak bisa mengubah role-nya sendiri. Minta admin lain untuk melakukannya.",
      });
    }

    const { error } = await supabase.from("profiles").update({ role }).eq("id", user_id);
    if (error) return sendInternalServerError(res, "Failed to update role");
    log.info("admin_role_change", { adminId, targetId: user_id, newRole: role });
    return res.status(200).json({ success: true });
  }

  return sendMethodNotAllowed(res, "GET, PATCH");
}
