import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { log } from "@/lib/logger";

export default createHandler({
  GET: method({
    auth: "admin",
    handler: async ({ req, supabase, res }) => {
      // "pending" | "verified" | "all" | "archived" | "pending_confirmation"
      // (the last two are Phase 23 lifecycle states surfaced in the admin UI)
      const status = req.query.status as string | undefined;
      let query = supabase
        .from("vendors")
        .select(
          "id,slug,name,tagline,category,city,whatsapp,is_verified,created_at,owner_id,university,ktm_url," +
            "archived_at,archive_reason,last_confirmed_at,confirmation_sent_at," +
            "profiles!vendors_owner_id_fkey(full_name,username)",
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (status === "pending") query = query.eq("is_verified", false).is("archived_at", null);
      else if (status === "verified") query = query.eq("is_verified", true).is("archived_at", null);
      else if (status === "archived") query = query.not("archived_at", "is", null);
      else if (status === "pending_confirmation") {
        // Sent the email but no response yet (still active, in the grace window).
        query = query
          .is("archived_at", null)
          .not("confirmation_sent_at", "is", null);
      } else if (status === "all" || !status) {
        // Default to "active scope" so the existing UI doesn't suddenly show archived.
        query = query.is("archived_at", null);
      }

      const { data, error } = await query;
      if (error) return sendInternalServerError(res, "Failed to load vendors", error);

      // Resolve the real auth.users.email per owner via the strict service-role
      // client. Cache per owner_id so duplicate owners don't trigger duplicate calls.
      const serviceClient = getSupabaseServiceClient();
      if (!serviceClient) return sendServiceUnavailable(res);

      // The PostgREST select string above includes a join, which supabase-js's
      // type inference collapses to a `GenericStringError`-tainted union. The
      // runtime shape is correct, so narrow it once here and let the rest of
      // the handler work against a concrete row type.
      type VendorRow = { owner_id: string | null; [k: string]: unknown };
      const rows = (data ?? []) as unknown as VendorRow[];

      const uniqueOwnerIds = Array.from(
        new Set(rows.map((v) => v.owner_id).filter((id): id is string => Boolean(id))),
      );
      const emailByOwnerId = new Map<string, string | null>();
      await Promise.all(
        uniqueOwnerIds.map(async (ownerId) => {
          const { data: userData, error: userErr } = await serviceClient.auth.admin.getUserById(ownerId);
          if (userErr) {
            log.warn("admin_vendors_get_user_failed", { ownerId, message: userErr.message });
            emailByOwnerId.set(ownerId, null);
            return;
          }
          emailByOwnerId.set(ownerId, userData.user?.email ?? null);
        }),
      );

      const vendors = rows.map((v) => ({
        ...v,
        owner_email: v.owner_id ? emailByOwnerId.get(v.owner_id) ?? null : null,
      }));

      return res.status(200).json({ vendors });
    },
  }),

  PATCH: method({
    auth: "admin",
    handler: async ({ supabase, userId: adminId, body, res }) => {
      const { vendor_id, action, reason } = (body ?? {}) as {
        vendor_id?: string;
        action?: "approve" | "reject" | "archive" | "reactivate";
        // Optional override for archive (defaults to 'admin'); ignored for others.
        reason?: "unresponsive" | "admin" | "self" | "duplicate" | "spam";
      };
      if (!vendor_id || !action) return res.status(400).json({ error: "vendor_id and action required" });

      if (action === "archive") {
        // Archive replaces hard-delete for the lifecycle flow: keeps history
        // intact (threads/reviews/wallet ledger) and is reversible.
        const archiveReason = reason ?? "admin";
        const { data: archived, error } = await supabase
          .from("vendors")
          .update({ archived_at: new Date().toISOString(), archive_reason: archiveReason })
          .eq("id", vendor_id)
          .is("archived_at", null)               // idempotent — double-archive is a no-op
          .select("id,owner_id,name")
          .maybeSingle();
        if (error) return sendInternalServerError(res, "Failed to archive vendor", error);
        if (!archived) {
          log.info("admin_vendor_archive_noop", { adminId, vendorId: vendor_id });
          return res.status(200).json({ success: true, archived: true, noop: true });
        }
        log.warn("admin_vendor_archive", { adminId, vendorId: vendor_id, ownerId: archived.owner_id, reason: archiveReason });
        return res.status(200).json({ success: true, archived: true });
      }

      if (action === "reactivate") {
        // Reactivation also resets the confirmation window so the vendor gets
        // a fresh 90 days before the next "still active?" email fires.
        const { data: reactivated, error } = await supabase
          .from("vendors")
          .update({
            archived_at: null,
            archive_reason: null,
            last_confirmed_at: new Date().toISOString(),
            confirmation_token_hash: null,
            confirmation_sent_at: null,
          })
          .eq("id", vendor_id)
          .not("archived_at", "is", null)        // only act on currently-archived rows
          .select("id,owner_id,name")
          .maybeSingle();
        if (error) return sendInternalServerError(res, "Failed to reactivate vendor", error);
        if (!reactivated) {
          log.info("admin_vendor_reactivate_noop", { adminId, vendorId: vendor_id });
          return res.status(200).json({ success: true, reactivated: true, noop: true });
        }
        log.warn("admin_vendor_reactivate", { adminId, vendorId: vendor_id, ownerId: reactivated.owner_id });
        return res.status(200).json({ success: true, reactivated: true });
      }

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
        if (error) return sendInternalServerError(res, "Failed to approve vendor", error);
        if (!approved) {
          // Either the vendor doesn't exist or it was already verified — either
          // way the admin's intent is satisfied. Return 200 without a re-notify.
          log.info("admin_vendor_approve_noop", { adminId, vendorId: vendor_id });
          return res.status(200).json({ success: true, is_verified: true, noop: true });
        }
        // Fire the vendor_approved notification from the API (not via DB trigger)
        // so the admin path and the no-op short-circuit can't double-send.
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
        // still intact and the admin can retry.
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
            log.error("admin_vendor_reject_role_reset_failed", {
              adminId,
              vendorId: vendor_id,
              ownerId: vendorToReject.owner_id,
              message: roleError.message,
            });
            return sendInternalServerError(res, "Gagal mereset role owner. Vendor belum dihapus, silakan coba lagi.", roleError);
          }
        }

        const { error } = await supabase.from("vendors").delete().eq("id", vendor_id);
        if (error) {
          log.error("admin_vendor_reject_delete_failed", {
            adminId,
            vendorId: vendor_id,
            ownerId: vendorToReject?.owner_id,
            message: error.message,
          });
          return sendInternalServerError(res, "Role owner sudah direset ke customer, tapi vendor gagal dihapus. Cek manual.", error);
        }

        log.warn("admin_vendor_reject", { adminId, vendorId: vendor_id, ownerId: vendorToReject?.owner_id });
        return res.status(200).json({ success: true, deleted: true });
      }

      return res.status(400).json({ error: "Invalid action" });
    },
  }),
});
