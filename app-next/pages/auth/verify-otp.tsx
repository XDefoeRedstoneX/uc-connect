import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function VerifyOtpPage() {
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
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

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    setMessage("OTP verified. You are now logged in.");
  }

  return (
    <SiteLayout title="Verify OTP | UC Connect">
      <section className="card">
        <h1>Verify OTP</h1>
        <form onSubmit={onSubmit} className="stack">
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required />
          </label>
          <label>
            OTP code
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </label>
          <button type="submit">Verify</button>
        </form>
        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
