export type PhoneErrorCode = "format" | "digits" | "length" | null;

/**
 * Normalizes an Indonesian phone number to local `0…` form.
 * Accepts +62 / 62 / 8 / 0 prefixes. Returns an error code (not a message) so
 * callers can translate. Empty input is treated as "no value" (errorCode null).
 */
export function normalizeIndonesianPhoneToLocal(
  phoneRaw: string,
): { phone: string | null; errorCode: PhoneErrorCode } {
  const trimmed = phoneRaw.trim();
  if (!trimmed) return { phone: null, errorCode: null };

  let cleaned = trimmed.replace(/[\s\-()]/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+")) {
    if (!cleaned.startsWith("+62")) return { phone: null, errorCode: "format" };
    cleaned = `0${cleaned.slice(3)}`;
  } else if (cleaned.startsWith("62")) {
    cleaned = `0${cleaned.slice(2)}`;
  } else if (cleaned.startsWith("8")) {
    cleaned = `0${cleaned}`;
  } else if (!cleaned.startsWith("0")) {
    return { phone: null, errorCode: "format" };
  }

  if (!/^\d+$/.test(cleaned)) return { phone: null, errorCode: "digits" };
  if (cleaned.length < 10 || cleaned.length > 13) return { phone: null, errorCode: "length" };

  return { phone: cleaned, errorCode: null };
}

export function isValidIndonesianPhone(raw: string): boolean {
  return normalizeIndonesianPhoneToLocal(raw).phone !== null;
}

export function toInternationalIndonesian(localPhone: string | null): string | null {
  return localPhone ? `+62${localPhone.slice(1)}` : null;
}
