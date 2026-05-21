import type { NextApiRequest, NextApiResponse } from "next";

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight in-memory rate limiter (fixed window per key).
//
// NOTE: state lives in the process, so on serverless (Vercel) each instance has
// its own counter — this is a best-effort spam guard, not a hard global limit.
// For real production scale, back this with Upstash/Redis. The money path's real
// safety (Midtrans signature + idempotent settlement + server-side balance
// checks) does not depend on this limiter.
// ─────────────────────────────────────────────────────────────────────────────

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map can't grow unbounded.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export function clientIp(req: NextApiRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return xff[0];
  return req.socket?.remoteAddress ?? "unknown";
}

/**
 * Returns true if the request is allowed, false if it should be throttled.
 * `key` should identify the actor (e.g. `reviews:<userId>`).
 */
export function allow(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
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

/**
 * Enforce a limit and write a 429 if exceeded. Returns true when throttled
 * (caller should `return`), false when the request may proceed.
 */
export function rateLimited(
  res: NextApiResponse,
  key: string,
  opts: { limit: number; windowMs: number },
): boolean {
  const { ok, retryAfter } = allow(key, opts.limit, opts.windowMs);
  if (!ok) {
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfter} detik.` });
    return true;
  }
  return false;
}
