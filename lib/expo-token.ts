import { createHmac, timingSafeEqual } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Expo fast-track QR token (server-only).
//
// The expo signup flow has no email-confirm step and no admin approval — the
// person holding the rotating QR is vouching in person. To make sure a leaked
// link or an old screenshot can't keep minting verified vendors after the event,
// the QR encodes a SHORT-LIVED, HMAC-SIGNED token instead of a static URL.
//
//   token = base64url({ iat, exp }) + "." + base64url(HMAC-SHA256(payload))
//
// The admin QR page mints a fresh token every couple of minutes; the public
// signup API re-verifies the signature + expiry on every submit. A second,
// independent kill-switch lives in Redis (see lib/expo-state.ts) so the admin
// can also revoke the whole flow with one tap, regardless of token expiry.
// ─────────────────────────────────────────────────────────────────────────────

const SECRET = process.env.EXPO_QR_SECRET;

/** Default lifetime of a freshly-minted token. */
export const EXPO_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type ExpoTokenPayload = { iat: number; exp: number };

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/** True when the signing secret is configured. Routes should 503 when false. */
export function isExpoConfigured(): boolean {
  return typeof SECRET === "string" && SECRET.length > 0;
}

/** Mint a signed token valid for `ttlMs`. Throws if the secret is missing. */
export function signExpoToken(ttlMs: number = EXPO_TOKEN_TTL_MS): string {
  if (!SECRET) throw new Error("EXPO_QR_SECRET is not configured");
  const now = Date.now();
  const payload: ExpoTokenPayload = { iat: now, exp: now + ttlMs };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64, SECRET)}`;
}

export type ExpoVerifyResult =
  | { ok: true; payload: ExpoTokenPayload }
  | { ok: false; reason: "unconfigured" | "malformed" | "bad_signature" | "expired" };

/**
 * Verify a token's signature and expiry. Uses a timing-safe comparison so the
 * signature can't be probed byte-by-byte.
 */
export function verifyExpoToken(token: unknown): ExpoVerifyResult {
  if (!SECRET) return { ok: false, reason: "unconfigured" };
  if (typeof token !== "string" || !token.includes(".")) return { ok: false, reason: "malformed" };

  const [payloadB64, sig] = token.split(".", 2);
  if (!payloadB64 || !sig) return { ok: false, reason: "malformed" };

  const expected = sign(payloadB64, SECRET);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: ExpoTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as ExpoTokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}
