export function toPublicAuthErrorMessage(
  rawMessage: string | null | undefined,
  action: "login" | "register" | "forgot" | "reset",
) {
  const fallbackByAction = {
    login: "Login gagal. Silakan coba lagi.",
    register: "Pendaftaran gagal. Silakan coba lagi.",
    forgot: "Permintaan reset password belum dapat diproses.",
    reset: "Perubahan kata sandi gagal. Silakan coba lagi.",
  } as const;

  if (!rawMessage) return fallbackByAction[action];

  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email atau kata sandi tidak sesuai.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Email belum diverifikasi. Silakan cek inbox Anda.";
  }

  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Email sudah terdaftar. Silakan masuk atau gunakan email lain.";
  }

  if (normalized.includes("password") && normalized.includes("weak")) {
    return "Kata sandi terlalu lemah. Gunakan kombinasi yang lebih kuat.";
  }

  if (normalized.includes("rate") || normalized.includes("too many requests")) {
    return "Terlalu banyak percobaan. Mohon coba beberapa saat lagi.";
  }

  return fallbackByAction[action];
}

export function toPublicPageErrorMessage(rawMessage: string | null | undefined) {
  if (!rawMessage) {
    return "Terjadi kendala saat memuat data. Silakan coba lagi.";
  }

  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("not found")) {
    return "Data yang Anda cari tidak ditemukan.";
  }

  return "Terjadi kendala saat memuat data. Silakan coba lagi.";
}
