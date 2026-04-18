import Link from "next/link";
import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
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

    const normalizedFullName = fullName.trim();
    if (!normalizedFullName) {
      setError("Full name is required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const normalizedPhone = normalizeIndonesianPhoneToLocal(phone);
    if (normalizedPhone.error) {
      setError(normalizedPhone.error);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase env is missing.");
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
      return;
    }

    setMessage("Registration successful. Check your email for verification.");
  }

  return (
    <SiteLayout title="Register | UC Connect">
      <section className="card">
        <h1>Register</h1>
        <form onSubmit={onRegister} className="stack">
          <label>
            Full name
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          </label>
          <label>
            Confirm password
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              required
              minLength={8}
            />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="0812… / +62812…" />
          </label>
          {phone && phonePreview.error && <p className="err">{phonePreview.error}</p>}
          {phoneInternational && !phonePreview.error && <p>International format: {phoneInternational}</p>}
          <button type="submit">Create account</button>
        </form>

        <div className="row-gap">
          <Link href="/auth/login">Already have an account?</Link>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
