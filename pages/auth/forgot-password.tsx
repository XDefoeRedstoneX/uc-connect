import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { useLanguage } from "@/lib/language-context";
import { toPublicAuthErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(t("errors.serviceUnavailable"));
      return;
    }

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError(toPublicAuthErrorMessage(resetError.message, "forgot"));
      return;
    }

    setMessage(t("pages.forgotPassword.successMsg"));
  }

  return (
    <SiteLayout title="Forgot Password | UC Connect">
      <section className="card">
        <h1>{t("pages.forgotPassword.title")}</h1>
        <p>{t("pages.forgotPassword.subtitle")}</p>
        <form onSubmit={onSubmit} className="stack">
          <label>
            {t("pages.forgotPassword.email")}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit">{t("pages.forgotPassword.submitBtn")}</button>
        </form>
        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
