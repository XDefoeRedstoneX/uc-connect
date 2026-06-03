"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AdminNav from "@/components/admin/AdminNav";
import Icon, { type IconName } from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Stat from "@/components/ui/Stat";
import EmptyState from "@/components/ui/EmptyState";
import LoadingScreen from "@/components/LoadingScreen";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Stats = {
  totalUsers: number;
  totalVendors: number;
  pendingVendors: number;
  totalThreads: number;
  totalReplies: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      setToken(tok);

      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${tok}` } });
      if (res.status === 403) { void router.replace("/unauthorized"); return; }
      if (!res.ok) { setError("Gagal memuat data admin."); setLoading(false); return; }

      const json = await res.json();
      setStats(json.stats);
      setLoading(false);
    };
    void init();
  }, [router]);

  if (loading) return (
    <SiteLayout title="Admin | UC Connect">
      <LoadingScreen message="Memverifikasi akses admin..." />
    </SiteLayout>
  );

  if (error) return (
    <SiteLayout title="Admin | UC Connect">
      <EmptyState icon="alert-triangle" title={error} description="Coba muat ulang halaman." />
    </SiteLayout>
  );

  return (
    <SiteLayout title="Admin Panel | UC Connect">
      <AdminNav current="dash" />

      {/* KPIs */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {([
            { label: "Total Users", value: stats.totalUsers, icon: "users", href: "/admin/users" },
            { label: "Total Vendors", value: stats.totalVendors, icon: "store", href: "/admin/vendors?status=verified" },
            { label: "Pending Verifikasi", value: stats.pendingVendors, icon: "clock", href: "/admin/vendors?status=pending", highlight: stats.pendingVendors > 0 },
            { label: "Forum Threads", value: stats.totalThreads, icon: "file-text", href: "/admin/forum" },
            { label: "Forum Replies", value: stats.totalReplies, icon: "chat", href: "/admin/forum?type=replies" },
          ] as { label: string; value: number; icon: IconName; href: string; highlight?: boolean }[]).map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <Stat icon={s.icon} value={s.value} label={s.label} tone={s.highlight ? "warm" : "default"} />
            </Link>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {stats && stats.pendingVendors > 0 && (
        <div className="dash-card" style={{ background: "var(--orange-soft)", border: "1.5px solid var(--orange-light)" }}>
          <p style={{ fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--orange-dark)" }}>
            <Icon name="alert-triangle" size={16} strokeWidth={2.4} /> {stats.pendingVendors} vendor menunggu verifikasi
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "0.75rem" }}>
            Periksa dan verifikasi vendor baru untuk menampilkannya di direktori.
          </p>
          <Button href="/admin/vendors" iconRight="arrow-right" style={{ background: "var(--orange)" }}>
            Lihat Vendor
          </Button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
        {([
          { icon: "store", title: "Verifikasi Vendor", desc: "Setujui atau tolak vendor baru", href: "/admin/vendors" },
          { icon: "users", title: "Kelola Users", desc: "Lihat dan ubah role pengguna", href: "/admin/users" },
          { icon: "star", title: "Moderasi Ulasan", desc: "Hapus ulasan yang melanggar", href: "/admin/reviews" },
          { icon: "chat", title: "Moderasi Forum", desc: "Hapus thread atau balasan yang melanggar", href: "/admin/forum" },
          { icon: "flag", title: "Antrean Laporan", desc: "Tinjau laporan dari pengguna", href: "/admin/reports" },
          { icon: "trophy", title: "Featured & Lelang", desc: "Pantau bid & jalankan settlement", href: "/admin/featured" },
        ] as { icon: IconName; title: string; desc: string; href: string }[]).map(a => (
          <Link key={a.href} href={a.href} className="action-card" style={{ textDecoration: "none", textAlign: "center" }}>
            <span className="action-icon" style={{ color: "var(--pacific)" }}><Icon name={a.icon} size={26} strokeWidth={2.2} /></span>
            <p className="action-label">{a.title}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: 0 }}>{a.desc}</p>
          </Link>
        ))}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
