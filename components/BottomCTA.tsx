import { useState } from "react";
import { useRouter } from "next/router";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function BottomCTA() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleVendorRegister() {
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      await router.push("/auth/register?type=vendor");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      await router.push("/auth/register?type=vendor");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok || !data.profile) {
      await router.push("/auth/login");
      setLoading(false);
      return;
    }

    if (data.profile.role === "vendor") {
      await router.push("/vendor/dashboard");
      setLoading(false);
      return;
    }

    await router.push("/vendor/onboarding");
    setLoading(false);
  }
  return (
    <section className="section-cta" style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--text)', marginBottom: '0.75rem', position: 'relative', zIndex: 1 }}>
        Punya Bisnis Kampus?
      </h2>
      <p style={{ color: 'var(--muted)', maxWidth: '36rem', margin: '0 auto 1.5rem', position: 'relative', zIndex: 1 }}>
        Daftarkan UMKM mahasiswa Anda dan jangkau ribuan pelanggan potensial di UC Connect. 
        Kelola pesanan, terima pembayaran, dan berkembang bersama komunitas kami.
      </p>
      <button
        type="button"
        onClick={handleVendorRegister}
        disabled={loading}
        className="btn"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {loading ? "Loading..." : "Daftar Sebagai Vendor"}
      </button>
    </section>
  );
}
