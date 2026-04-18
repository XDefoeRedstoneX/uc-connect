import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
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
      setError("Supabase env is missing.");
      return;
    }

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Reset email sent. Check your inbox.");
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
