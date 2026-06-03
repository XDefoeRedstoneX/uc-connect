import { z, type ZodError } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Shared zod primitives for server-side request validation. Endpoints compose
// these into per-route body schemas passed to `createHandler` (lib/api-handler).
// Messages are in Bahasa Indonesia to match the existing client-facing copy.
// ─────────────────────────────────────────────────────────────────────────────

/** First human-readable message from a ZodError, for the 400 `error` field. */
export function firstZodError(err: ZodError): string {
  return err.issues[0]?.message ?? "Input tidak valid";
}

/** Trimmed, non-empty string with a max length. */
export function requiredText(label: string, max = 500) {
  return z
    .string({ message: `${label} wajib diisi.` })
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(max, `${label} terlalu panjang (maks ${max} karakter).`);
}

/** Trimmed string that may be empty/absent; empty → null. */
export function optionalText(max = 500) {
  return z
    .string()
    .trim()
    .max(max, `Teks terlalu panjang (maks ${max} karakter).`)
    .nullish()
    .transform((v) => (v ? v : null));
}

/** Integer rupiah amount within [min, max], coerced from string or number. */
export function idrAmount(min: number, max: number, message?: string) {
  return z.coerce
    .number({ message: message ?? "Nominal tidak valid." })
    .int(message ?? "Nominal tidak valid.")
    .min(min, message ?? `Nominal minimal Rp${min.toLocaleString("id-ID")}`)
    .max(max, message ?? `Nominal maksimal Rp${max.toLocaleString("id-ID")}`);
}

/** A UUID string (Supabase row ids). */
export const uuid = z.string().uuid("ID tidak valid.");

export { z };
