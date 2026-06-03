"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AdminNav from "@/components/admin/AdminNav";
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
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ fontSize: "2rem" }}>⏳</p>
        <p style={{ color: "var(--muted)" }}>Memverifikasi akses admin...</p>
      </div>
    </SiteLayout>
  );

  if (error) return (
    <SiteLayout title="Admin | UC Connect">
      <div className="card" style={{ textAlign: "center" }}>
        <p className="err">{error}</p>
      </div>
    </SiteLayout>
  );

  return (
    <SiteLayout title="Admin Panel | UC Connect">
      <AdminNav current="dash" />

      {/* KPIs */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Users", value: stats.totalUsers, icon: "👥", href: "/admin/users" },
            { label: "Total Vendors", value: stats.totalVendors, icon: "🏪", href: "/admin/vendors?status=verified" },
            { label: "Pending Verifikasi", value: stats.pendingVendors, icon: "⏳", href: "/admin/vendors?status=pending", highlight: stats.pendingVendors > 0 },
            { label: "Forum Threads", value: stats.totalThreads, icon: "📝", href: "/admin/forum" },
            { label: "Forum Replies", value: stats.totalReplies, icon: "💬", href: "/admin/forum?type=replies" },
          ].map(s => (
            <Link
              key={s.label}
              href={s.href}
              className="dash-stat"
              style={{ textDecoration: "none", color: "inherit", display: "block", ...(s.highlight ? { border: "2px solid var(--orange)", background: "var(--orange-soft)" } : {}) }}
            >
              <p style={{ fontSize: "1.5rem", margin: "0 0 0.25rem" }}>{s.icon}</p>
              <p className="dash-stat-value">{s.value}</p>
              <p className="dash-stat-label">{s.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {stats && stats.pendingVendors > 0 && (
        <div className="dash-card" style={{ background: "var(--orange-soft)", border: "1.5px solid var(--orange-light)" }}>
          <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>⚠️ {stats.pendingVendors} vendor menunggu verifikasi</p>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "0.75rem" }}>
            Periksa dan verifikasi vendor baru untuk menampilkannya di direktori.
          </p>
          <Link href="/admin/vendors" className="btn" style={{ background: "var(--orange)" }}>
            Lihat Vendor →
          </Link>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
        {[
          { icon: "🏪", title: "Verifikasi Vendor", desc: "Setujui atau tolak vendor baru", href: "/admin/vendors" },
          { icon: "👥", title: "Kelola Users", desc: "Lihat dan ubah role pengguna", href: "/admin/users" },
          { icon: "⭐", title: "Moderasi Ulasan", desc: "Hapus ulasan yang melanggar", href: "/admin/reviews" },
          { icon: "💬", title: "Moderasi Forum", desc: "Hapus thread atau balasan yang melanggar", href: "/admin/forum" },
          { icon: "🚩", title: "Antrean Laporan", desc: "Tinjau laporan dari pengguna", href: "/admin/reports" },
          { icon: "🏆", title: "Featured & Lelang", desc: "Pantau bid & jalankan settlement", href: "/admin/featured" },
        ].map(a => (
          <Link key={a.href} href={a.href} className="action-card" style={{ textDecoration: "none", textAlign: "center" }}>
            <p className="action-icon">{a.icon}</p>
            <p className="action-label">{a.title}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: 0 }}>{a.desc}</p>
          </Link>
        ))}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
