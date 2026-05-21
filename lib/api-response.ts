import type { NextApiResponse } from "next";
import { log, newRequestId, errFields } from "@/lib/logger";

export function sendMethodNotAllowed(res: NextApiResponse, allow: string) {
  res.setHeader("Allow", allow);
  return res.status(405).json({ error: "Method not allowed" });
}

export function sendServiceUnavailable(res: NextApiResponse) {
  return res.status(503).json({ error: "Service temporarily unavailable" });
}

/**
 * Sends a 500. Pass `cause` (the caught error) and optional `context` to emit a
 * structured log line with a correlation id that's also returned to the client.
 */
export function sendInternalServerError(
  res: NextApiResponse,
  message = "Unable to process request",
  cause?: unknown,
  context: Record<string, unknown> = {},
) {
  const requestId = newRequestId();
  if (cause !== undefined) {
    log.error("api_500", { requestId, message, ...context, ...errFields(cause) });
  }
  return res.status(500).json({ error: message, requestId });
}
