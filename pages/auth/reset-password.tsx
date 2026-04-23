import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { toPublicAuthErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
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

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(toPublicAuthErrorMessage(updateError.message, "reset"));
      return;
    }

    setMessage("Kata sandi berhasil diperbarui.");
  }

  return (
    <SiteLayout title="Reset Password | UC Connect">
      <section className="card">
        <h1>Reset Password</h1>
        <form onSubmit={onSubmit} className="stack">
          <label>
            New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </label>
          <button type="submit">Update password</button>
        </form>
        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
