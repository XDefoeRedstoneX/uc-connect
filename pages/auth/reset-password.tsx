import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { useLanguage } from "@/lib/language-context";
import { toPublicAuthErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (password !== confirmPassword) {
      setError(t("pages.resetPassword.passwordsMismatch"));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(t("errors.serviceUnavailable"));
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(toPublicAuthErrorMessage(updateError.message, "reset"));
      return;
    }

    setMessage(t("pages.resetPassword.successMsg"));
    setTimeout(() => {
      window.location.href = "/auth/login";
    }, 2000);
  }

  return (
    <SiteLayout title="Reset Password | UC Connect">
      <section className="card">
        <h1>{t("pages.resetPassword.title")}</h1>
        <p>{t("pages.resetPassword.subtitle")}</p>
        <form onSubmit={onSubmit} className="stack">
          <label>
            {t("pages.resetPassword.password")}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </label>
          <label>
            {t("pages.resetPassword.confirmPassword")}
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
          </label>
          <button type="submit">{t("pages.resetPassword.submitBtn")}</button>
        </form>
        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
