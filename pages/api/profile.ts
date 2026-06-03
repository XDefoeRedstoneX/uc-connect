import { createHandler, method } from "@/lib/api-handler";
import { sendInternalServerError, sendServiceUnavailable } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const PROFILE_COLUMNS = "id,username,full_name,phone,avatar_url,major,graduation_year,role,updated_at";

function trimToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default createHandler({
  GET: method({
    auth: "user",
    handler: async ({ supabase, userId, user, res }) => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .single();

      if (error) {
        const errorCode = (error as unknown as { code?: string }).code;
        const isMissingRow =
          errorCode === "PGRST116" ||
          (typeof error.message === "string" && /0 rows|No rows/i.test(error.message));

        if (!isMissingRow) return sendInternalServerError(res, "Unable to load profile", error);

        const now = new Date().toISOString();
        const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
        let metaUsername = trimToNull(meta.username);
        const metaFullName = trimToNull(meta.full_name);
        const metaPhone = trimToNull(meta.phone);

        // If the signup metadata's username is already taken (case-insensitive),
        // drop it on first profile create so the user lands without an error.
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
            { id: userId, username: metaUsername, full_name: metaFullName, phone: metaPhone, updated_at: now },
            { onConflict: "id" },
          )
          .select(PROFILE_COLUMNS)
          .single();

        if (createError) return sendInternalServerError(res, "Unable to save profile", createError);
        return res.status(200).json({ profile: created });
      }

      return res.status(200).json({ profile: data });
    },
  }),

  PUT: method({
    auth: "user",
    handler: async ({ supabase, userId, body, res }) => {
      const { username, full_name, phone, avatar_url, major, graduation_year } = (body ?? {}) as Record<string, unknown>;

      const cleanUsername = trimToNull(username);
      const cleanFullName = trimToNull(full_name);
      const cleanPhone = trimToNull(phone);
      const cleanAvatarUrl = trimToNull(avatar_url);
      const cleanMajor = trimToNull(major);

      // graduation_year: empty/absent clears the field; a provided-but-invalid
      // value is a 400 (instead of silently saving NULL).
      const gradProvided =
        graduation_year !== undefined && graduation_year !== null && String(graduation_year).trim() !== "";
      const gradNum = Number(graduation_year);
      const gradValid = Number.isInteger(gradNum) && gradNum > 1900 && gradNum < 2100;
      if (gradProvided && !gradValid) {
        return res.status(400).json({ error: "Tahun lulus tidak valid (harus antara 1901–2099)." });
      }
      const cleanGradYear = gradProvided ? gradNum : null;

      // Case-insensitive uniqueness check for a clean 409 instead of a raw 23505.
      if (cleanUsername) {
        const { data: clash } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", cleanUsername)
          .neq("id", userId)
          .maybeSingle();
        if (clash) return res.status(409).json({ error: "Username sudah dipakai. Pilih yang lain." });
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
        .select(PROFILE_COLUMNS)
        .single();

      if (error) {
        // Race past the SELECT above: another writer claimed the username.
        const code = (error as unknown as { code?: string }).code;
        if (code === "23505") return res.status(409).json({ error: "Username sudah dipakai. Pilih yang lain." });
        return sendInternalServerError(res, "Unable to save profile", error);
      }

      return res.status(200).json({ profile: data });
    },
  }),

  DELETE: method({
    auth: "user",
    handler: async ({ userId, body, res }) => {
      // Require an explicit "HAPUS" body gate so a stray DELETE (CSRF, mistapped
      // fetch in the console) can't nuke an account without confirmation. Checked
      // before the rate limit so a wrong confirm doesn't consume the budget.
      const { confirm } = (body ?? {}) as { confirm?: string };
      if (confirm !== "HAPUS") {
        return res.status(400).json({ error: 'Konfirmasi tidak valid. Kirim body { "confirm": "HAPUS" }.' });
      }

      if (await enforceRateLimit(res, `delete-account:${userId}`, { limit: 1, windowMs: 60 * 60 * 1000 })) return;

      // auth.admin.* requires the service-role key — fail loud if it's missing.
      const serviceClient = getSupabaseServiceClient();
      if (!serviceClient) return sendServiceUnavailable(res);

      log.warn("account_self_delete", { userId });
      const { error } = await serviceClient.auth.admin.deleteUser(userId);
      if (error) return sendInternalServerError(res, "Gagal menghapus akun", error);
      return res.status(200).json({ success: true });
    },
  }),
});
