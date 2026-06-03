import type { NextApiRequest, NextApiResponse } from "next";

// ─────────────────────────────────────────────────────────────────────────────
// Fixed-window rate limiter.
//
// Backing store, chosen at runtime:
//   • Upstash Redis (global, hard limit) when UPSTASH_REDIS_REST_URL +
//     UPSTASH_REDIS_REST_TOKEN are set.
//   • In-memory per-process fallback otherwise (best-effort spam guard; each
//     serverless instance keeps its own counter).
//
// If a Redis call fails (network/5xx) we fall back to the in-memory counter for
// that request rather than failing the API — a limiter outage must not take the
// money paths down. Their real safety (Midtrans signature + idempotent
// settlement + server-side balance checks) does not depend on this limiter.
// ─────────────────────────────────────────────────────────────────────────────

type Result = { ok: boolean; retryAfter: number };

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisEnabled = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// ── In-memory fallback ──────────────────────────────────────────────────────
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map can't grow unbounded.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** Synchronous in-memory check. Allows exactly `limit` requests per window. */
export function allow(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfter: 0 };
}

// ── Upstash Redis backing ─────────────────────────────────────────────────────
// One pipelined round-trip: INCR the counter, set the window TTL only on the
// first hit (PEXPIRE … NX), and read the remaining TTL for Retry-After.
// Returns null on any failure so the caller can fall back to memory.
async function redisFixedWindow(key: string, limit: number, windowMs: number): Promise<Result | null> {
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, windowMs, "NX"],
        ["PTTL", key],
      ]),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: number | string | null }[];
    const count = Number(data[0]?.result ?? 0);
    const ttlMs = Number(data[2]?.result ?? windowMs);
    if (count > limit) {
      const retryAfter = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000));
      return { ok: false, retryAfter };
    }
    return { ok: true, retryAfter: 0 };
  } catch {
    return null;
  }
}

/** Best-effort client IP for IP-keyed limits on unauthenticated routes. */
export function clientIp(req: NextApiRequest): string {
  // Vercel and most proxies overwrite x-real-ip with the edge-observed client
  // IP, so prefer it. The left-most x-forwarded-for entry is client-supplied
  // and spoofable — consult it only as a fallback before the raw socket.
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) return realIp.trim();
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return xff[0];
  return req.socket?.remoteAddress ?? "unknown";
}

/**
 * Enforce a limit and write a 429 (with Retry-After) if exceeded. Returns true
 * when throttled (the caller should `return`), false when the request proceeds.
 * `key` should identify the actor, e.g. `reviews:<userId>`.
 */
export async function enforceRateLimit(
  res: NextApiResponse,
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<boolean> {
  let result: Result | null = null;
  if (redisEnabled) result = await redisFixedWindow(key, opts.limit, opts.windowMs);
  if (!result) result = allow(key, opts.limit, opts.windowMs);

  if (!result.ok) {
    res.setHeader("Retry-After", String(result.retryAfter));
    res.status(429).json({ error: `Terlalu banyak permintaan. Coba lagi dalam ${result.retryAfter} detik.` });
    return true;
  }
  return false;
}
