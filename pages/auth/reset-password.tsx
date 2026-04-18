import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
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
      setError("Supabase env is missing.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated successfully.");
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
