import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import SiteLayout from "@/components/SiteLayout";
import VendorOnboardingWizard from "@/components/VendorOnboardingWizard";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function VendorOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        window.location.href = "/auth/login?next=/vendor/onboarding&role=vendor";
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionToken = sessionData.session?.access_token;
      if (!sessionToken) {
        window.location.href = "/auth/login?next=/vendor/onboarding&role=vendor";
        return;
      }

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const json = await response.json();

      if (!response.ok || !json.profile) {
        window.location.href = "/auth/login?next=/vendor/onboarding&role=vendor";
        return;
      }

      if (json.profile.role === "vendor") {
        router.replace("/");
        return;
      }

      setToken(sessionToken);
      setLoading(false);
    };

    void loadSession();
  }, [router]);

  async function handleComplete(values: Record<string, unknown>) {
    if (!token) {
      setError("Sesi login tidak ditemukan.");
      return;
    }

    setError(null);
    const response = await fetch("/api/vendor-onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
    });

    const json = await response.json();
    if (!response.ok) {
      setError(typeof json.error === "string" ? json.error : "Gagal menyimpan data vendor.");
      return;
    }

    router.replace("/");
  }

  return (
    <SiteLayout title="Vendor Onboarding | UC Connect">
      <section className="card">
        <h1>Vendor Onboarding</h1>
        <p>Lengkapi data bisnis kamu untuk melanjutkan pendaftaran vendor.</p>

        {loading && <p>Memuat sesi...</p>}
        {error && <p className="err">{error}</p>}

        {!loading && <VendorOnboardingWizard onComplete={handleComplete} />}
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
