import type { NextApiRequest, NextApiResponse } from "next";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import { resolveAuthedUser } from "@/lib/api-auth";
import { requireAdmin } from "@/lib/api-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  sendInternalServerError,
  sendMethodNotAllowed,
  sendServiceUnavailable,
} from "@/lib/api-response";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { firstZodError } from "@/lib/validation";

// ─────────────────────────────────────────────────────────────────────────────
// createHandler — the single entry point for API routes. It owns the boilerplate
// every endpoint used to copy by hand:
//   • method routing + Allow header / 405
//   • auth ("none" | "user" | "admin"), with the 503 / 401 / 403 responses in
//     ONE place instead of duplicated per file
//   • optional fixed-window rate limiting (keyed by userId, or client IP on
//     public routes)
//   • optional zod body validation → typed `body`, standardized 400 on failure
//   • one try/catch that funnels any thrown error to sendInternalServerError
//     (structured log + correlation requestId)
//
// What it deliberately does NOT do: per-resource ownership. `resolveAuthedUser`
// returns a service-role client that bypasses RLS, so each handler must still
// assert the caller owns the row it touches (e.g. vendor.owner_id === userId).
// That check is resource-specific and stays the one security line every new
// endpoint must write.
// ─────────────────────────────────────────────────────────────────────────────

export type AuthMode = "none" | "user" | "admin";

export type ApiContext<TBody = unknown> = {
  req: NextApiRequest;
  res: NextApiResponse;
  /** Service-role client for "user"/"admin"; anon/server client for "none". */
  supabase: SupabaseClient;
  /** Authenticated user id; "" on public ("none") routes. */
  userId: string;
  /** Full auth user (email/metadata); null on admin/public routes. */
  user: User | null;
  /** Parsed + validated body when a schema is given, else the raw req.body. */
  body: TBody;
};

export type RateLimitRule = { limit: number; windowMs: number; key: string };

export type MethodConfig<TBody> = {
  auth?: AuthMode; // default "user"
  rateLimit?: RateLimitRule;
  body?: ZodType<TBody>;
  handler: (ctx: ApiContext<TBody>) => unknown | Promise<unknown>;
};

/**
 * Optional builder that infers the body type from a method's zod schema, so the
 * handler's `ctx.body` is fully typed. Equivalent to writing the config inline.
 */
export function method<TBody>(config: MethodConfig<TBody>): MethodConfig<TBody> {
  return config;
}

// Body type varies per method; the per-method `method()`/inline config is what
// type-checks each handler against its own schema. The map only needs to hold
// them, so the element type is intentionally loose here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MethodsMap = Partial<Record<string, MethodConfig<any>>>;

export function createHandler(methods: MethodsMap) {
  const allowed = Object.keys(methods).join(", ");

  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    const method = (req.method ?? "GET").toUpperCase();
    const cfg = methods[method];
    if (!cfg) return sendMethodNotAllowed(res, allowed);

    const authMode = cfg.auth ?? "user";

    // ── Auth + supabase client ────────────────────────────────────────────
    let supabase: SupabaseClient;
    let userId = "";
    let user: User | null = null;

    if (authMode === "none") {
      const client = getSupabaseServerClient();
      if (!client) return sendServiceUnavailable(res);
      supabase = client;
    } else if (authMode === "admin") {
      const ctx = await requireAdmin(req, res); // writes its own error response
      if (!ctx) return;
      supabase = ctx.supabase;
      userId = ctx.userId;
    } else {
      const a = await resolveAuthedUser(req);
      if (a.status === 503) return sendServiceUnavailable(res);
      if (a.status !== 200 || !a.supabase || !a.userId) {
        return res.status(a.status).json({ error: a.error ?? "Unauthorized" });
      }
      supabase = a.supabase;
      userId = a.userId;
      user = a.user;
    }

    // ── Rate limit ────────────────────────────────────────────────────────
    if (cfg.rateLimit) {
      const actor = userId || clientIp(req);
      if (await enforceRateLimit(res, `${cfg.rateLimit.key}:${actor}`, cfg.rateLimit)) return;
    }

    // ── Body validation ───────────────────────────────────────────────────
    let body: unknown = req.body;
    if (cfg.body) {
      const parsed = cfg.body.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: firstZodError(parsed.error) });
      }
      body = parsed.data;
    }

    // ── Run handler under one error funnel ────────────────────────────────
    try {
      await cfg.handler({ req, res, supabase, userId, user, body });
    } catch (e) {
      if (!res.writableEnded) {
        sendInternalServerError(res, "Unable to process request", e, { path: req.url, method });
      }
    }
  };
}
