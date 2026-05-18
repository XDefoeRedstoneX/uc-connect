import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase env is missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      return;
    }

    setMessage("Login successful. Redirecting...");
    await router.replace("/directory/home");
  }

  return (
    <SiteLayout title="Login | UC Connect">
      <section className="card">
        <h1>Login</h1>
        <form onSubmit={onLogin} className="stack">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          <button type="submit">Login</button>
        </form>

        <div className="row-gap">
          <Link href="/auth/forgot-password">Forgot password?</Link>
          <Link href="/auth/register">Create account</Link>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
