import { randomUUID } from "crypto";

// Minimal structured logger — emits one JSON object per line so Vercel/your log
// drain can parse it. No external dependency. Attach a requestId to correlate.

type Level = "info" | "warn" | "error";

export function newRequestId(): string {
  return randomUUID();
}

function emit(level: Level, event: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, fields: Record<string, unknown> = {}) => emit("info", event, fields),
  warn: (event: string, fields: Record<string, unknown> = {}) => emit("warn", event, fields),
  error: (event: string, fields: Record<string, unknown> = {}) => emit("error", event, fields),
};

/** Normalize an unknown error into a loggable shape. */
export function errFields(e: unknown): Record<string, unknown> {
  if (e instanceof Error) return { message: e.message, name: e.name };
  if (e && typeof e === "object") return { message: String((e as { message?: unknown }).message ?? e) };
  return { message: String(e) };
}
