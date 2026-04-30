import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { GetServerSideProps } from "next";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import AuthTabs from "@/components/AuthTabs";
import FormField from "@/components/FormField";
import SiteLayout from "@/components/SiteLayout";
import { useLanguage } from "@/lib/language-context";
import { toPublicAuthErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextPath = typeof router.query.next === "string" && router.query.next.startsWith("/")
    ? router.query.next
    : "/";

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(t("errors.serviceUnavailable"));
      setSubmitting(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(toPublicAuthErrorMessage(authError.message, "login"));
      setSubmitting(false);
      return;
    }

    setMessage(t("pages.login.successMsg"));
    await router.replace(nextPath);
    setSubmitting(false);
  }

  return (
    <SiteLayout title="Login | UC Connect">
      <AuthSplitLayout
        labelledBy="login-title"
        visualPanel={
          <>
            <span className="badge gold">{t("pages.login.panelBadge")}</span>
            <h2>{t("pages.login.panelTitle")}</h2>
            <p>{t("pages.login.panelDesc")}</p>
          </>
        }
      >
        <AuthTabs currentPage="login" />

        <h1 id="login-title">{t("pages.login.title")}</h1>
        <p className="muted">{t("pages.login.subtitle")}</p>

        <form onSubmit={onLogin} className="stack" aria-label="Login form">
          <FormField
            id="login-email"
            label={t("pages.login.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nama@kampus.ac.id"
          />
          <FormField
            id="login-password"
            label={t("pages.login.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Minimal 8 karakter"
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Memproses..." : t("pages.login.submitBtn")}
          </button>
        </form>

        <div className="row-gap">
          <Link href="/auth/forgot-password">{t("pages.login.forgotPassword")}</Link>
          <Link href="/auth/register">{t("pages.login.noAccount")}</Link>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </AuthSplitLayout>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
  