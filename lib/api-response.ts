import type { NextApiResponse } from "next";

export function sendMethodNotAllowed(res: NextApiResponse, allow: string) {
  res.setHeader("Allow", allow);
  return res.status(405).json({ error: "Method not allowed" });
}

export function sendServiceUnavailable(res: NextApiResponse) {
  return res.status(503).json({ error: "Service temporarily unavailable" });
}

export function sendInternalServerError(
  res: NextApiResponse,
  message = "Unable to process request",
) {
  return res.status(500).json({ error: message });
}
