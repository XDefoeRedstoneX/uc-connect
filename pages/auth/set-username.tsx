import { FormEvent, useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { useLanguage } from "@/lib/language-context";

export default function SetUsernamePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = typeof router.query.next === "string" && router.query.next.startsWith("/")
    ? router.query.next
    : "/";

  useEffect(() => {
    const guard = async () => {
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

      const json = await response.json();
      if (!response.ok || !json.profile) {
        window.location.href = "/auth/login";
        return;
      }

      if (json.profile.username) {
        await router.replace(nextPath);
      }
    };

    void guard();
  }, [nextPath, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError(t("pages.setUsername.errors.required"));
      setSubmitting(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(t("errors.serviceUnavailable"));
      setSubmitting(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError(t("errors.sessionExpired"));
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username: trimmedUsername }),
    });

    const json = await response.json();
    if (!response.ok) {
      setError(toPublicPageErrorMessage(json.error));
      setSubmitting(false);
      return;
    }

    await router.replace(nextPath);
  }

  return (
    <SiteLayout title={`${t("pages.setUsername.title")} | UC Connect`}>
      <AuthSplitLayout
        labelledBy="set-username-title"
        visualPanel={
          <>
            <span className="badge gold">{t("pages.setUsername.panelBadge")}</span>
            <h2>{t("pages.setUsername.panelTitle")}</h2>
            <p>{t("pages.setUsername.panelDesc")}</p>
          </>
        }
      >
        <h1 id="set-username-title">{t("pages.setUsername.title")}</h1>
        <p className="muted">{t("pages.setUsername.subtitle")}</p>

        <form onSubmit={handleSubmit} className="stack" aria-label="Set username form">
          <label htmlFor="username">
            <span>{t("pages.setUsername.usernameLabel")}</span>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              placeholder={t("pages.setUsername.usernamePlaceholder")}
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? t("pages.setUsername.savingBtn") : t("pages.setUsername.saveBtn")}
          </button>
        </form>

        {error && <p className="err">{error}</p>}
      </AuthSplitLayout>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
