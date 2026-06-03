"use client";
import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import SiteLayout from "@/components/SiteLayout";
import LoadingScreen from "@/components/LoadingScreen";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import TabOverview from "@/components/vendor/TabOverview";
import TabEditProfile from "@/components/vendor/TabEditProfile";
import TabItems from "@/components/vendor/TabItems";
import TabHours from "@/components/vendor/TabHours";
import TabReviews from "@/components/vendor/TabReviews";
import TabFeatured from "@/components/vendor/TabFeatured";
import TabAnalytics from "@/components/vendor/TabAnalytics";

export type VendorProfile = {
  id: string; slug: string; name: string; tagline: string | null;
  category: string | null; city: string | null; address: string | null; description: string | null;
  whatsapp: string | null; website_url: string | null; hero_image_url: string | null; logo_url: string | null;
  is_verified: boolean; whatsapp_clicks: number;
  university?: string | null; sales_system?: string | null; delivery_methods?: string | null;
};
export type VendorHour = {
  id?: string; day_of_week: number; opens_at: string | null;
  closes_at: string | null; is_closed: boolean; notes: string | null;
};
export type VendorItem = {
  id: string; item_type: "menu" | "service" | "product"; name: string;
  description: string | null; price: number; currency: string;
  image_url: string | null; sort_order: number; is_active: boolean; created_at: string;
};

const TABS = [
  { id: "overview", label: "📊 Overview" },
  { id: "profile", label: "✏️ Edit Profil" },
  { id: "items", label: "📦 Produk & Layanan" },
  { id: "hours", label: "🕐 Jam Operasional" },
  { id: "reviews", label: "⭐ Ulasan" },
  { id: "featured", label: "🏆 Featured & Dompet" },
  { id: "analytics", label: "📈 Analitik" },
];

const DEFAULT_HOURS: VendorHour[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i, opens_at: "08:00", closes_at: "17:00", is_closed: i === 0, notes: null,
}));

export default function VendorDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [hours, setHours] = useState<VendorHour[]>(DEFAULT_HOURS);
  const [items, setItems] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { router.replace("/auth/login"); return; }

      const pr = await fetch("/api/profile", { headers: { Authorization: `Bearer ${tok}` } });
      const pj = await pr.json();
      if (!pr.ok || pj.profile?.role !== "vendor") { router.replace("/"); return; }

      setToken(tok);
      setUserId(sd.session?.user?.id ?? null);

      const [vr, ir, hr] = await Promise.all([
        fetch("/api/vendor/profile", { headers: { Authorization: `Bearer ${tok}` } }),
        fetch("/api/vendor/items", { headers: { Authorization: `Bearer ${tok}` } }),
        fetch("/api/vendor/hours", { headers: { Authorization: `Bearer ${tok}` } }),
      ]);

      if (vr.ok) { const vj = await vr.json(); setVendor(vj.vendor); }
      else { const vj = await vr.json(); setError(vj.error ?? "Gagal memuat data vendor"); }
      if (ir.ok) { const ij = await ir.json(); setItems(ij.items ?? []); }
      if (hr.ok) {
        const hj = await hr.json();
        const loaded: VendorHour[] = hj.hours ?? [];
        setHours(DEFAULT_HOURS.map(def => loaded.find(h => h.day_of_week === def.day_of_week) ?? def));
      }
      setLoading(false);
    };
    void init();
  }, [router]);

  if (loading) return (
    <SiteLayout title="Vendor Dashboard | UC Connect">
      <LoadingScreen message="Memuat dashboard..." />
    </SiteLayout>
  );

  if (error || !vendor) return (
    <SiteLayout title="Vendor Dashboard | UC Connect">
      <div className="card" style={{ textAlign: "center" }}>
        <p className="err">{error ?? "Vendor tidak ditemukan."}</p>
        <button onClick={() => router.push("/")}>Kembali</button>
      </div>
    </SiteLayout>
  );

  // Featured-bidding requires a verified vendor (API rejects with 403 otherwise);
  // preempt that by gating the tab in the UI so the only message the unverified
  // vendor sees is the pending banner, not a 403 alert.
  const featuredLocked = !vendor.is_verified;

  return (
    <SiteLayout title={`${vendor.name} Dashboard | UC Connect`}>
      <div className="stack" style={{ gap: "1rem", marginTop: 0 }}>
        {!vendor.is_verified && (
          <div className="dash-card" style={{ background: "var(--orange-soft)", border: "1.5px solid var(--orange-light)" }}>
            <p style={{ fontWeight: 700, margin: "0 0 0.35rem", color: "var(--orange-dark)" }}>
              ⏳ Vendor menunggu verifikasi admin
            </p>
            <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5, color: "var(--text)" }}>
              Tokomu belum tampil di direktori publik dan kamu belum bisa ikut lelang featured.
              Selesaikan profil + jam operasional + item agar siap dipublikasikan. Admin akan
              memverifikasi KTM dalam waktu dekat.
            </p>
          </div>
        )}

        {/* Tab bar */}
        <div className="scroll-tabs" style={{ borderBottom: "2px solid var(--border)", paddingBottom: "0.5rem" }}>
          {TABS.map(t => {
            const locked = featuredLocked && t.id === "featured";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => !locked && setActiveTab(t.id)}
                disabled={locked}
                title={locked ? "Tersedia setelah vendor diverifikasi" : undefined}
                style={{
                  background: activeTab === t.id ? "var(--gradient-main)" : "transparent",
                  color: activeTab === t.id ? "#fff" : "var(--muted)",
                  border: "none", borderRadius: "8px", padding: "0.45rem 1rem",
                  fontWeight: 700, cursor: locked ? "not-allowed" : "pointer", fontSize: "0.88rem",
                  opacity: locked ? 0.5 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                {t.label}{locked ? " 🔒" : ""}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" && <TabOverview vendor={vendor} items={items} hours={hours} setActiveTab={setActiveTab} />}
        {activeTab === "profile" && token && userId && <TabEditProfile vendor={vendor} token={token} userId={userId} onSaved={setVendor} />}
        {activeTab === "items" && token && userId && <TabItems items={items} vendor={vendor} token={token} userId={userId} onItemsChange={setItems} />}
        {activeTab === "hours" && token && <TabHours hours={hours} token={token} onSaved={setHours} />}
        {activeTab === "reviews" && token && <TabReviews vendorId={vendor.id} token={token} />}
        {activeTab === "featured" && token && !featuredLocked && <TabFeatured vendorId={vendor.id} token={token} />}
        {activeTab === "analytics" && token && <TabAnalytics token={token} />}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
