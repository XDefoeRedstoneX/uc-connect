import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import AuthTabs from "@/components/AuthTabs";
import FormField from "@/components/FormField";
import SiteLayout from "@/components/SiteLayout";
import { useLanguage } from "@/lib/language-context";
import { toPublicAuthErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function RegisterPage() {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function normalizeIndonesianPhoneToLocal(phoneRaw: string): { phone: string | null; error: string | null } {
    const trimmed = phoneRaw.trim();
    if (!trimmed) return { phone: null, error: null };

    let cleaned = trimmed.replace(/[\s\-()]/g, "");
    cleaned = cleaned.replace(/[^0-9+]/g, "");
    if (cleaned.startsWith("+")) {
      if (!cleaned.startsWith("+62")) {
        return { phone: null, error: t("pages.register.errors.phoneRequired") };
      }
      cleaned = `0${cleaned.slice(3)}`;
    } else if (cleaned.startsWith("62")) {
      cleaned = `0${cleaned.slice(2)}`;
    } else if (cleaned.startsWith("8")) {
      cleaned = `0${cleaned}`;
    } else if (!cleaned.startsWith("0")) {
      return { phone: null, error: t("pages.register.errors.phoneInvalidFormat") };
    }

    if (!/^\d+$/.test(cleaned)) {
      return { phone: null, error: t("pages.register.errors.phoneOnlyDigits") };
    }

    if (cleaned.length < 10 || cleaned.length > 13) {
      return { phone: null, error: t("pages.register.errors.phoneInvalidLength") };
    }

    return { phone: cleaned, error: null };
  }

  const phonePreview = normalizeIndonesianPhoneToLocal(phone);
  const phoneInternational = phonePreview.phone ? `+62${phonePreview.phone.slice(1)}` : null;

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);

    const normalizedFullName = fullName.trim();
    if (!normalizedFullName) {
      setError(t("pages.register.errors.fullNameRequired"));
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t("pages.register.errors.passwordsMismatch"));
      setSubmitting(false);
      return;
    }

    const normalizedPhone = normalizeIndonesianPhoneToLocal(phone);
    if (normalizedPhone.error) {
      setError(normalizedPhone.error);
      setSubmitting(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(t("errors.serviceUnavailable"));
      setSubmitting(false);
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
      setError(toPublicAuthErrorMessage(authError.message, "register"));
      setSubmitting(false);
      return;
    }

    setMessage(t("pages.register.successMsg"));
    setSubmitting(false);
  }

  return (
    <SiteLayout title="Register | UC Connect">
      <AuthSplitLayout
        labelledBy="register-title"
        visualPanel={
          <>
            <span className="badge gold">{t("pages.register.panelBadge")}</span>
            <h2>{t("pages.register.panelTitle")}</h2>
            <p>{t("pages.register.panelDesc")}</p>
          </>
        }
      >
        <AuthTabs currentPage="register" />

        <h1 id="register-title">{t("pages.register.title")}</h1>
        <p className="muted">{t("pages.register.subtitle")}</p>

        <form onSubmit={onRegister} className="stack" aria-label="Register form">
          <FormField
            id="register-full-name"
            label={t("pages.register.fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Nama sesuai identitas"
          />
          <FormField
            id="register-email"
            label={t("pages.register.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nama@kampus.ac.id"
          />
          <FormField
            id="register-password"
            label={t("pages.register.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Minimal 8 karakter"
          />
          <FormField
            id="register-confirm-password"
            label={t("pages.register.confirmPassword")}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Ulangi kata sandi"
          />
          <FormField
            id="register-phone"
            label={t("pages.register.phone")}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812... / +62812..."
            error={phone && phonePreview.error ? phonePreview.error : null}
            helpText={phoneInternational && !phonePreview.error ? `${t("pages.register.internationalFormat")} ${phoneInternational}` : null}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Memproses..." : t("pages.register.submitBtn")}
          </button>
        </form>

        <div className="row-gap">
          <Link href="/auth/login">{t("pages.register.haveAccount")}</Link>
        </div>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </AuthSplitLayout>
    </SiteLayout>
  );
}
