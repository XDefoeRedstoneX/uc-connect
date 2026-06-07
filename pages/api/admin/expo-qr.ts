import { z } from "@/lib/validation";
import { createHandler, method } from "@/lib/api-handler";
import { signExpoToken, isExpoConfigured, EXPO_TOKEN_TTL_MS } from "@/lib/expo-token";
import { isExpoEnabled, setExpoEnabled, getRecentExpoSignups } from "@/lib/expo-state";
import { log } from "@/lib/logger";

// Admin control surface for the expo fast-track QR.
//   GET   → current enabled state, a freshly-signed token, the public signup
//           URL to encode in the QR, and the recent-signups audit list.
//   POST  → flip the kill-switch on/off.
//
// The page re-fetches GET every couple of minutes so the displayed QR always
// carries a token that's well within its 10-minute lifetime.

function publicBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host = (req.headers["x-forwarded-host"] as string | undefined) ?? (req.headers.host as string | undefined) ?? "";
  return `${proto}://${host}`;
}

export default createHandler({
  GET: method({
    auth: "admin",
    handler: async ({ req, res }) => {
      if (!isExpoConfigured()) {
        return res.status(503).json({ error: "EXPO_QR_SECRET belum dikonfigurasi di server." });
      }
      const enabled = await isExpoEnabled();
      const token = signExpoToken();
      const base = publicBaseUrl(req);
      const signupUrl = `${base}/x?t=${encodeURIComponent(token)}`;
      const signups = await getRecentExpoSignups(50);

      return res.status(200).json({
        enabled,
        token,
        signupUrl,
        ttlMs: EXPO_TOKEN_TTL_MS,
        signups,
      });
    },
  }),

  POST: method({
    auth: "admin",
    body: z.object({ action: z.enum(["enable", "disable"]) }),
    handler: async ({ body, userId: adminId, res }) => {
      const enable = body.action === "enable";
      const ok = await setExpoEnabled(enable);
      if (!ok) {
        return res.status(502).json({ error: "Gagal menyimpan status. Coba lagi." });
      }
      log.info("expo_kill_switch", { adminId, enabled: enable });
      return res.status(200).json({ enabled: enable });
    },
  }),
});
