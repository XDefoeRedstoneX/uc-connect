import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/api-admin";
import { sendMethodNotAllowed, sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { log } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase, userId: adminId } = ctx;

  // GET — list vendors with optional filter
  if (req.method === "GET") {
    const status = req.query.status as string | undefined; // "pending" | "verified" | "all"
    let query = supabase
      .from("vendors")
      .select("id,slug,name,tagline,category,city,whatsapp,is_verified,created_at,owner_id,university,ktm_url,profiles!vendors_owner_id_fkey(full_name,username)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (status === "pending") query = query.eq("is_verified", false);
    else if (status === "verified") query = query.eq("is_verified", true);

    const { data, error } = await query;
    if (error) return sendInternalServerError(res, "Failed to load vendors");

    // Resolve the real auth.users.email per owner via the strict service-role
    // client. Cache per owner_id so duplicate owners don't trigger duplicate calls.
    const serviceClient = getSupabaseServiceClient();
    if (!serviceClient) return sendServiceUnavailable(res);

    const uniqueOwnerIds = Array.from(
      new Set((data ?? []).map((v) => v.owner_id).filter((id): id is string => Boolean(id))),
    );
    const emailByOwnerId = new Map<string, string | null>();
    await Promise.all(
      uniqueOwnerIds.map(async (ownerId) => {
        const { data: userData, error: userErr } = await serviceClient.auth.admin.getUserById(ownerId);
        if (userErr) {
          console.warn("[api/admin/vendors] getUserById failed for", ownerId, userErr.message);
          emailByOwnerId.set(ownerId, null);
          return;
        }
        emailByOwnerId.set(ownerId, userData.user?.email ?? null);
      }),
    );

    const vendors = (data ?? []).map((v) => ({
      ...v,
      owner_email: v.owner_id ? emailByOwnerId.get(v.owner_id) ?? null : null,
    }));

    return res.status(200).json({ vendors });
  }

  // PATCH — approve or reject vendor
  if (req.method === "PATCH") {
    const { vendor_id, action } = req.body as { vendor_id?: string; action?: "approve" | "reject" };
    if (!vendor_id || !action) return res.status(400).json({ error: "vendor_id and action required" });

    if (action === "approve") {
      // Update only the still-unverified rows so a double-click can't fire two
      // notifications. The update is observable so the second click is a no-op.
      const { data: approved, error } = await supabase
        .from("vendors")
        .update({ is_verified: true })
        .eq("id", vendor_id)
        .eq("is_verified", false)
        .select("id,owner_id,name")
        .maybeSingle();
      if (error) {
        console.error("[api/admin/vendors approve]", error);
        return sendInternalServerError(res, "Failed to approve vendor");
      }
      if (!approved) {
        // Either the vendor doesn't exist or it was already verified — either
        // way the admin's intent is satisfied. Return 200 without a re-notify.
        log.info("admin_vendor_approve_noop", { adminId, vendorId: vendor_id });
        return res.status(200).json({ success: true, is_verified: true, noop: true });
      }
      // Fire the vendor_approved notification from the API (not via DB
      // trigger) so the admin path and the no-op short-circuit above can't
      // double-send. The legacy trigger is dropped in this phase's migration.
      if (approved.owner_id) {
        await supabase.from("notifications").insert({
          user_id: approved.owner_id,
          type: "vendor_approved",
          payload: { vendor_id: approved.id, vendor_name: approved.name },
        });
      }
      log.info("admin_vendor_approve", { adminId, vendorId: vendor_id, ownerId: approved.owner_id });
      return res.status(200).json({ success: true, is_verified: true });
    }

    if (action === "reject") {
      // Read owner_id FIRST so we can reset their role before deleting the
      // vendor row. Role-reset runs first: if it fails, the vendor record is
      // still intact and the admin can retry, instead of being orphaned with
      // a stale "vendor" role and no vendor row.
      const { data: vendorToReject } = await supabase
        .from("vendors")
        .select("owner_id")
        .eq("id", vendor_id)
        .maybeSingle();

      if (vendorToReject?.owner_id) {
        const { error: roleError } = await supabase
          .from("profiles")
          .update({ role: "customer" })
          .eq("id", vendorToReject.owner_id);
        if (roleError) {
          console.error("[api/admin/vendors reject] role reset failed", roleError);
          log.error("admin_vendor_reject_role_reset_failed", {
            adminId,
            vendorId: vendor_id,
            ownerId: vendorToReject.owner_id,
            message: roleError.message,
          });
          return res.status(500).json({
            error: "Gagal mereset role owner. Vendor belum dihapus, silakan coba lagi.",
          });
        }
      }

      const { error } = await supabase.from("vendors").delete().eq("id", vendor_id);
      if (error) {
        console.error("[api/admin/vendors reject] delete failed", error);
        log.error("admin_vendor_reject_delete_failed", {
          adminId,
          vendorId: vendor_id,
          ownerId: vendorToReject?.owner_id,
          message: error.message,
        });
        return res.status(500).json({
          error: "Role owner sudah direset ke customer, tapi vendor gagal dihapus. Cek manual.",
        });
      }

      log.warn("admin_vendor_reject", { adminId, vendorId: vendor_id, ownerId: vendorToReject?.owner_id });
      return res.status(200).json({ success: true, deleted: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  }

  return sendMethodNotAllowed(res, "GET, PATCH");
}
