import { FormEvent, useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function EditProfilePage() {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState("");
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

  useEffect(() => {
    const load = async () => {
      setError(null);
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        window.location.href = "/auth/login";
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/auth/login";
        return;
      }

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.profile) {
        window.location.href = "/auth/login";
        return;
      }

      setFullName(data.profile?.full_name ?? "");
      setPhone(data.profile?.phone ?? "");
    };

    void load();
  }, [t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedPhone = normalizeIndonesianPhoneToLocal(phone);
    if (normalizedPhone.error) {
      setError(normalizedPhone.error);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      window.location.href = "/auth/login";
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ full_name: fullName, phone: normalizedPhone.phone ?? "" }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(toPublicPageErrorMessage(data.error));
      return;
    }

    setMessage(t("pages.editProfile.successMsg"));
  }

  return (
    <SiteLayout title="Edit Profile | UC Connect">
      <section className="card">
        <h1>{t("pages.editProfile.title")}</h1>
        <form onSubmit={onSubmit} className="stack">
          <label>
            {t("pages.editProfile.fullName")}
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label>
            {t("pages.editProfile.phone")}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="0812… / +62812…" />
          </label>
          {phone && phonePreview.error && <p className="err">{phonePreview.error}</p>}
          {phoneInternational && !phonePreview.error && <p>{t("pages.editProfile.internationalFormat")} {phoneInternational}</p>}
          <button type="submit">{t("pages.editProfile.submitBtn")}</button>
        </form>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
