import { createHandler, method } from "@/lib/api-handler";
import { verifyExpoToken } from "@/lib/expo-token";
import { isExpoEnabled } from "@/lib/expo-state";

// Public, read-only check the fast-track page calls on load so it can show a
// friendly "ask staff to refresh the QR" state instead of letting the user fill
// the whole form only to be rejected on submit.
export default createHandler({
  GET: method({
    auth: "none",
    rateLimit: { limit: 60, windowMs: 60_000, key: "expo-status" },
    handler: async ({ req, res }) => {
      const t = req.query.t;
      const verdict = verifyExpoToken(typeof t === "string" ? t : undefined);
      const enabled = await isExpoEnabled();
      const valid = verdict.ok && enabled;
      return res.status(200).json({
        valid,
        enabled,
        reason: verdict.ok ? (enabled ? null : "disabled") : verdict.reason,
      });
    },
  }),
});
