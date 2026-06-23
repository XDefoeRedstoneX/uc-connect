// Transactional email via Resend. The first user is Phase 23b vendor
// confirmation; future flows (password reset receipts, weekly vendor stats)
// can share this module.
//
// Designed to fail-soft: if RESEND_API_KEY is unset (local dev, preview env)
// every send is logged and dropped rather than thrown, so the rest of the
// request still succeeds. Production should obviously set the key.
import { log } from "@/lib/logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM = process.env.EMAIL_FROM || "UC Connect <noreply@uc-connect.app>";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  /** Plain-text fallback (most providers downrank HTML-only). */
  text: string;
  /** HTML body — keep inline-styled and table-based for client compat. */
  html: string;
  from?: string;
  /** Optional Reply-To override (e.g. point bounces at support@). */
  replyTo?: string;
};

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: "not_configured" }
  | { ok: false; status: number; message: string };

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    log.warn("email_skipped_no_key", { to: Array.isArray(msg.to) ? msg.to.join(",") : msg.to, subject: msg.subject });
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: msg.from ?? DEFAULT_FROM,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        reply_to: msg.replyTo,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log.error("email_send_failed", { status: res.status, body: text.slice(0, 500), subject: msg.subject });
      return { ok: false, status: res.status, message: text.slice(0, 500) };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id ?? "" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error("email_send_threw", { message, subject: msg.subject });
    return { ok: false, status: 0, message };
  }
}
