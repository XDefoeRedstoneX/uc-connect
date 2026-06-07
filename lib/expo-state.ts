import { log } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Expo fast-lane runtime state, backed by Upstash Redis (the same store the rate
// limiter uses). Two responsibilities:
//
//   1. Kill-switch — `expo:enabled` ("1"/"0"). The admin toggles this from the
//      QR page; the public signup API refuses every request while it's off.
//      This is independent of token expiry, so one tap shuts the whole flow.
//   2. Audit log — `expo:signups`, a capped list of the most recent fast-track
//      signups so the admin can review (and, if needed, delete) what came in
//      during the event without a schema change.
//
// Fail-open vs fail-closed: the *enable check* fails OPEN on a Redis outage (a
// transient blip must not kill the expo — the short-lived signed token is still
// the primary gate). An absent key (Redis reachable, never set) is treated as
// OFF, so the admin must explicitly turn the flow on before any signup works.
// ─────────────────────────────────────────────────────────────────────────────

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisEnabled = Boolean(URL && TOKEN);

const ENABLED_KEY = "expo:enabled";
const SIGNUPS_KEY = "expo:signups";
const SIGNUPS_CAP = 200;

export type ExpoSignupRecord = {
  vendorId: string;
  vendorName: string;
  email: string;
  slug: string;
  ts: number;
};

/** Run one Redis command via the Upstash REST API. Returns null on any failure. */
async function redis(command: (string | number)[]): Promise<unknown | null> {
  if (!redisEnabled) return null;
  try {
    const res = await fetch(URL as string, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown };
    return data.result ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether the fast-track flow is currently accepting signups.
 * - Redis unreachable  → true  (fail open; the signed token is still required)
 * - key absent / "0"   → false (admin hasn't enabled it, or killed it)
 * - key "1"            → true
 */
export async function isExpoEnabled(): Promise<boolean> {
  if (!redisEnabled) return false; // no store configured → can't have been enabled
  try {
    const res = await fetch(`${URL}/get/${ENABLED_KEY}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) return true; // outage: fail open
    const data = (await res.json()) as { result: string | null };
    return data.result === "1";
  } catch {
    return true; // outage: fail open
  }
}

/** Flip the kill-switch. Returns false if the write didn't land. */
export async function setExpoEnabled(enabled: boolean): Promise<boolean> {
  const result = await redis(["SET", ENABLED_KEY, enabled ? "1" : "0"]);
  if (result === null) {
    log.warn("expo_set_enabled_failed", { enabled });
    return false;
  }
  return true;
}

/** Append a signup to the capped audit list. Best-effort; never throws. */
export async function recordExpoSignup(entry: ExpoSignupRecord): Promise<void> {
  await redis(["LPUSH", SIGNUPS_KEY, JSON.stringify(entry)]);
  await redis(["LTRIM", SIGNUPS_KEY, 0, SIGNUPS_CAP - 1]);
}

/** Most recent fast-track signups, newest first. */
export async function getRecentExpoSignups(limit = 50): Promise<ExpoSignupRecord[]> {
  const result = await redis(["LRANGE", SIGNUPS_KEY, 0, limit - 1]);
  if (!Array.isArray(result)) return [];
  const out: ExpoSignupRecord[] = [];
  for (const raw of result) {
    if (typeof raw !== "string") continue;
    try {
      out.push(JSON.parse(raw) as ExpoSignupRecord);
    } catch {
      // skip malformed entry
    }
  }
  return out;
}
