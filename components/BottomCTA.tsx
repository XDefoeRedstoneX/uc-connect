import { useState } from "react";
import { useRouter } from "next/router";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import Icon from "@/components/ui/Icon";

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
    <section className="section-cta" style={{ marginTop: '2.5rem' }}>
      <span className="kicker" style={{ position: 'relative', zIndex: 1, justifyContent: 'center' }}>
        <Icon name="store" size={14} strokeWidth={2.6} />
        Untuk Pemilik Bisnis
      </span>
      <h2 className="display" style={{ fontSize: 'clamp(1.7rem, 1.2rem + 2vw, 2.6rem)', marginTop: '0.6rem', marginBottom: '0.75rem', position: 'relative', zIndex: 1 }}>
        Punya Bisnis Kampus?
      </h2>
      <p style={{ color: 'var(--muted)', maxWidth: '38rem', margin: '0 auto 1.6rem', position: 'relative', zIndex: 1 }}>
        Daftarkan UMKM mahasiswa Anda dan jangkau ribuan pelanggan potensial di UC Connect.
        Kelola pesanan, terima pembayaran, dan berkembang bersama komunitas kami.
      </p>
      <button
        type="button"
        onClick={handleVendorRegister}
        disabled={loading}
        className="btn btn-gradient btn--lg"
        style={{ position: 'relative', zIndex: 1, margin: '0 auto' }}
      >
        {loading ? "Memuat…" : (
          <>
            Daftar Sebagai Vendor
            <Icon name="arrow-right" size={18} strokeWidth={2.4} />
          </>
        )}
      </button>
    </section>
  );
}
