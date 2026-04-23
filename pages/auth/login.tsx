import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import AuthTabs from "@/components/AuthTabs";
import FormField from "@/components/FormField";
import SiteLayout from "@/components/SiteLayout";
import { toPublicAuthErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.");
      setSubmitting(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(toPublicAuthErrorMessage(authError.message, "login"));
      setSubmitting(false);
      return;
    }

    setMessage("Login berhasil. Mengarahkan ke beranda direktori...");
    await router.replace("/directory/home");
    setSubmitting(false);
  }

  return (
    <SiteLayout title="Login | UC Connect">
      <AuthSplitLayout
        labelledBy="login-title"
        visualPanel={
          <>
            <span className="badge gold">Trusted Campus Marketplace</span>
            <h2>Temukan Vendor Mahasiswa Terverifikasi</h2>
            <p>Jelajahi bisnis kuliner, jasa kreatif, hingga kebutuhan event kampus dalam satu platform yang aman.</p>
            <p className="inline-note">ID-first interface with English helper text for broader usability.</p>
          </>
        }
      >
        <AuthTabs currentPage="login" />

        <h1 id="login-title">Masuk ke UC Connect</h1>
        <p className="muted">Akses direktori bisnis mahasiswa dan kelola koneksi komunitas Anda.</p>

        <form onSubmit={onLogin} className="stack" aria-label="Login form">
          <FormField
            id="login-email"
            label="Email Kampus / Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nama@kampus.ac.id"
          />
          <FormField
            id="login-password"
            label="Kata Sandi / Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Minimal 8 karakter"
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Memproses..." : "Masuk / Login"}
          </button>
        </form>

        <div className="row-gap">
          <Link href="/auth/forgot-password">Lupa password? / Forgot password?</Link>
          <Link href="/auth/register">Belum punya akun? / Create account</Link>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </AuthSplitLayout>
    </SiteLayout>
  );
}
