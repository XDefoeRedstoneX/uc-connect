import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { UserProfile } from "@/types/domain";

export default function CustomerProfilePage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError(t("errors.serviceUnavailable"));
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setError(t("errors.sessionExpired"));
        setLoading(false);
        return;
      }

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await response.json();
      if (!response.ok) {
        setError(toPublicPageErrorMessage(json.error));
        setLoading(false);
        return;
      }

      setProfile(json.profile ?? null);
      setLoading(false);
    };

    void load();
  }, [t]);

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <SiteLayout title="Customer Profile | UC Connect">
      <section className="card">
        <h1>{t("pages.profile.title")}</h1>

        {loading && <p>{t("pages.profile.loading")}</p>}
        {error && <p className="err">{error}</p>}

        {profile && (
          <div className="stack compact-top">
            <p>{t("pages.profile.name")} {profile.full_name ?? t("pages.profile.notSet")}</p>
            <p>{t("pages.profile.phone")} {profile.phone ?? t("pages.profile.notSet")}</p>
            <p>{t("pages.profile.role")} {profile.role}</p>
            <Link className="btn" href="/customer/edit-profile">{t("pages.profile.editProfile")}</Link>
            <button type="button" className="secondary" onClick={logout}>{t("pages.profile.logout")}</button>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
