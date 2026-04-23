import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { toPublicAuthErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.");
      return;
    }

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError(toPublicAuthErrorMessage(resetError.message, "forgot"));
      return;
    }

    setMessage("Email reset password telah dikirim. Silakan cek inbox Anda.");
  }

  return (
    <SiteLayout title="Forgot Password | UC Connect">
      <section className="card">
        <h1>Forgot Password</h1>
        <form onSubmit={onSubmit} className="stack">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit">Send reset link</button>
        </form>
        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
