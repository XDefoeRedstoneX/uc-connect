import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import AuthTabs from "@/components/AuthTabs";
import FormField from "@/components/FormField";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function normalizeIndonesianPhoneToLocal(phoneRaw: string): { phone: string | null; error: string | null } {
    const trimmed = phoneRaw.trim();
    if (!trimmed) return { phone: null, error: null };

    let cleaned = trimmed.replace(/[\s\-()]/g, "");
    cleaned = cleaned.replace(/[^0-9+]/g, "");
    if (cleaned.startsWith("+")) {
      if (!cleaned.startsWith("+62")) {
        return { phone: null, error: "Phone must start with +62 for international format." };
      }
      cleaned = `0${cleaned.slice(3)}`;
    } else if (cleaned.startsWith("62")) {
      cleaned = `0${cleaned.slice(2)}`;
    } else if (cleaned.startsWith("8")) {
      cleaned = `0${cleaned}`;
    } else if (!cleaned.startsWith("0")) {
      return { phone: null, error: "Use format 08…, 8…, +62…, or 62…." };
    }

    if (!/^\d+$/.test(cleaned)) {
      return { phone: null, error: "Phone must contain digits only." };
    }

    if (cleaned.length < 10 || cleaned.length > 13) {
      return { phone: null, error: "Phone number length looks invalid." };
    }

    return { phone: cleaned, error: null };
  }

  const phonePreview = normalizeIndonesianPhoneToLocal(phone);
  const phoneInternational = phonePreview.phone ? `+62${phonePreview.phone.slice(1)}` : null;

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);

    const normalizedFullName = fullName.trim();
    if (!normalizedFullName) {
      setError("Full name is required.");
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    const normalizedPhone = normalizeIndonesianPhoneToLocal(phone);
    if (normalizedPhone.error) {
      setError(normalizedPhone.error);
      setSubmitting(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase env is missing.");
      setSubmitting(false);
      return;
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: normalizedFullName, phone: normalizedPhone.phone },
      },
    });

    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    setMessage("Registration successful. Check your email for verification.");
    setSubmitting(false);
  }

  return (
    <SiteLayout title="Register | UC Connect">
      <AuthSplitLayout
        labelledBy="register-title"
        visualPanel={
          <>
            <span className="badge gold">ID + EN Friendly Experience</span>
            <h2>Mulai Etalase Bisnis Kampus Anda</h2>
            <p>
              Daftar sekarang untuk menjual produk, menerima pesanan, dan membangun reputasi sebagai vendor terpercaya.
            </p>
            <p className="inline-note">Data nomor telepon akan dipakai untuk kontak WhatsApp vendor/pelanggan.</p>
          </>
        }
      >
        <AuthTabs currentPage="register" />

        <h1 id="register-title">Buat Akun UC Connect</h1>
        <p className="muted">Daftar sebagai pelanggan atau calon vendor untuk mulai membangun jaringan bisnis kampus.</p>

        <form onSubmit={onRegister} className="stack" aria-label="Register form">
          <FormField
            id="register-full-name"
            label="Nama Lengkap / Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Nama sesuai identitas"
          />
          <FormField
            id="register-email"
            label="Email / Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nama@kampus.ac.id"
          />
          <FormField
            id="register-password"
            label="Kata Sandi / Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Minimal 8 karakter"
          />
          <FormField
            id="register-confirm-password"
            label="Konfirmasi Password / Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Ulangi kata sandi"
          />
          <FormField
            id="register-phone"
            label="No. WhatsApp / Phone (Optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812... / +62812..."
            error={phone && phonePreview.error ? phonePreview.error : null}
            helpText={phoneInternational && !phonePreview.error ? `International format: ${phoneInternational}` : null}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Memproses..." : "Buat Akun / Create Account"}
          </button>
        </form>

        <div className="row-gap">
          <Link href="/auth/login">Sudah punya akun? / Already have an account?</Link>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </AuthSplitLayout>
    </SiteLayout>
  );
}
