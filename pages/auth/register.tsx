import Link from "next/link";
import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase env is missing.");
      return;
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { phone },
      },
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    setMessage("Registration successful. Check your email for verification.");
  }

  async function onSendOtp(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase env is missing.");
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
    if (otpError) {
      setError(otpError.message);
      return;
    }

    setMessage("OTP sent. Continue on verify page.");
  }

  return (
    <SiteLayout title="Register | UC Connect">
      <section className="card">
        <h1>Register</h1>
        <form onSubmit={onRegister} className="stack">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+628123..." required />
          </label>
          <button type="submit">Create account</button>
        </form>

        <form onSubmit={onSendOtp} className="stack compact-top">
          <button type="submit" className="secondary">Send OTP to phone</button>
        </form>

        <div className="row-gap">
          <Link href="/auth/verify-otp">Verify OTP</Link>
          <Link href="/auth/login">Already have an account?</Link>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
