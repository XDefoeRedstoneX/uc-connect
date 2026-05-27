import type { NextApiRequest, NextApiResponse } from "next";
import { sendInternalServerError, sendMethodNotAllowed, sendServiceUnavailable } from "@/lib/api-response";
import { resolveAuthedUser } from "@/lib/api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { rateLimited } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

function trimToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authContext = await resolveAuthedUser(req);
  if (authContext.status === 503) {
    return sendServiceUnavailable(res);
  }
  if (authContext.status !== 200 || !authContext.supabase || !authContext.userId) {
    return res.status(authContext.status).json({ error: authContext.error ?? "Unauthorized" });
  }

  const { supabase, userId, user } = authContext;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,full_name,phone,avatar_url,major,graduation_year,role,updated_at")
      .eq("id", userId)
      .single();

    if (error) {
      const errorCode = (error as unknown as { code?: string }).code;
      const isMissingRow =
        errorCode === "PGRST116" ||
        (typeof error.message === "string" && /0 rows|No rows/i.test(error.message));

      if (!isMissingRow) {
        console.error("[api/profile] failed to fetch profile", error);
        return sendInternalServerError(res, "Unable to load profile");
      }

      const now = new Date().toISOString();

      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      let metaUsername = trimToNull(meta.username);
      const metaFullName = trimToNull(meta.full_name);
      const metaPhone = trimToNull(meta.phone);

      // If the signup metadata's username is already taken (case-insensitive),
      // drop it on first profile create so the user lands without an error
      // and can pick a fresh one on the profile page.
      if (metaUsername) {
        const { data: clash } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", metaUsername)
          .neq("id", userId)
          .maybeSingle();
        if (clash) metaUsername = null;
      }

      const { data: created, error: createError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            username: metaUsername,
            full_name: metaFullName,
            phone: metaPhone,
            updated_at: now,
          },
          { onConflict: "id" },
        )
        .select("id,username,full_name,phone,avatar_url,major,graduation_year,role,updated_at")
        .single();

      if (createError) {
        console.error("[api/profile] failed to create profile", createError);
        return sendInternalServerError(res, "Unable to save profile");
      }

      return res.status(200).json({ profile: created });
    }

    return res.status(200).json({ profile: data });
  }

  if (req.method === "PUT") {
    const { username, full_name, phone, avatar_url, major, graduation_year } = req.body ?? {};

    const cleanUsername = trimToNull(username);
    const cleanFullName = trimToNull(full_name);
    const cleanPhone = trimToNull(phone);
    const cleanAvatarUrl = trimToNull(avatar_url);
    const cleanMajor = trimToNull(major);
    const gradNum = Number(graduation_year);
    const cleanGradYear = Number.isInteger(gradNum) && gradNum > 1900 && gradNum < 2100 ? gradNum : null;

    // Case-insensitive uniqueness check. The DB has a partial unique index on
    // lower(username), but we want a clean 409 with a Bahasa message instead
    // of a raw 23505 bubbling up to the client.
    if (cleanUsername) {
      const { data: clash } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .neq("id", userId)
        .maybeSingle();
      if (clash) {
        return res.status(409).json({ error: "Username sudah dipakai. Pilih yang lain." });
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          username: cleanUsername,
          full_name: cleanFullName,
          phone: cleanPhone,
          avatar_url: cleanAvatarUrl,
          major: cleanMajor,
          graduation_year: cleanGradYear,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("id,username,full_name,phone,avatar_url,major,graduation_year,role,updated_at")
      .single();

    if (error) {
      // Race past the SELECT above: another writer claimed the username
      // between our check and the upsert. Translate the unique-violation into
      // the same 409 the client already handles.
      const code = (error as unknown as { code?: string }).code;
      if (code === "23505") {
        return res.status(409).json({ error: "Username sudah dipakai. Pilih yang lain." });
      }
      console.error("[api/profile] failed to update profile", error);
      return sendInternalServerError(res, "Unable to save profile");
    }

    return res.status(200).json({ profile: data });
  }

  if (req.method === "DELETE") {
    // Self-delete: hard-removes the auth user. Cascade deletes profile, vendor
    // ownership becomes null, threads/replies/reviews/favorites cascade-delete.

    // Require an explicit "HAPUS" body gate so a stray DELETE (CSRF, mistapped
    // fetch in the console) can't nuke an account without confirmation.
    const { confirm } = (req.body ?? {}) as { confirm?: string };
    if (confirm !== "HAPUS") {
      return res.status(400).json({ error: 'Konfirmasi tidak valid. Kirim body { "confirm": "HAPUS" }.' });
    }

    if (rateLimited(res, `delete-account:${userId}`, { limit: 1, windowMs: 60 * 60 * 1000 })) return;

    // auth.admin.* requires the service-role key — fail loud if it's missing.
    const serviceClient = getSupabaseServiceClient();
    if (!serviceClient) return sendServiceUnavailable(res);

    log.warn("account_self_delete", { userId });
    const { error } = await serviceClient.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[api/profile] failed to delete auth user", error);
      return sendInternalServerError(res, "Gagal menghapus akun");
    }
    return res.status(200).json({ success: true });
  }

  return sendMethodNotAllowed(res, "GET, PUT, DELETE");
}
