// Vendor activity-confirmation tokens (Phase 23b).
//
// Mint a random token, store its sha-256 in vendors.confirmation_token_hash,
// email the raw token to the owner. When they click the link we hash the
// supplied token and compare — the DB never holds anything that can be used
// to confirm a vendor on its own, so a stolen DB row alone can't satisfy the
// 90-day check.
import { createHash, randomBytes } from "crypto";

/** 32 random bytes, base64url-encoded — URL-safe and ~43 chars long. */
export function generateConfirmationToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Constant-format SHA-256 hex digest. */
export function hashConfirmationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Build the confirmation URL the email links to. Falls back to relative URL
 * if NEXT_PUBLIC_APP_URL isn't set so the email at least contains the path.
 */
export function buildConfirmUrl(vendorId: string, token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/confirm/${vendorId}/${encodeURIComponent(token)}`;
}

// Knobs — keep all the lifecycle clocks in one place so admin tooling and
// future docs read from the same constants instead of magic numbers scattered
// across SQL + handlers.
export const CONFIRM_INTERVAL_DAYS = 90;   // active vendor needs to confirm at least this often
export const CONFIRM_RESPONSE_DAYS = 30;   // grace period after the email is sent
export const CONFIRM_BATCH_SIZE = 50;      // max vendors per cron invocation
