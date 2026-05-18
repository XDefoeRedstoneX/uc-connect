"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AdminNav from "@/components/admin/AdminNav";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ReportTargetType } from "@/types/domain";

type AdminReport = {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reporter_id: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  resolved_at: string | null;
  created_at: string;
  reporter: { full_name: string | null; username: string | null } | null;
};

function targetLink(r: AdminReport) {
  switch (r.target_type) {
    case "vendor": return { href: `/directory/vendor/${r.target_id}`, label: "🏪 Vendor" };
    case "review": return { href: `/admin/reviews`, label: "⭐ Ulasan" };
    case "thread": return { href: `/admin/forum`, label: "📝 Thread" };
    case "reply":  return { href: `/admin/forum`, label: "💬 Balasan" };
  }
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed" | "all">("open");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (tok: string, s: typeof status) => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?status=${s}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 403) { void router.replace("/unauthorized"); return; }
    if (res.ok) {
      const j = await res.json();
      setReports(j.reports ?? []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      setToken(tok);
      await load(tok, status);
    };
    void init();
  }, [router, load, status]);

  async function setReportStatus(reportId: string, newStatus: "resolved" | "dismissed") {
    if (!token) return;
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ report_id: reportId, status: newStatus }),
    });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId || status === "all"));
    }
  }

  return (
    <SiteLayout title="Laporan | Admin">
      <AdminNav current="reports" />

      <div className="dash-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>🚩 Antrean Laporan</h2>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {(["open", "resolved", "dismissed", "all"] as const).map((s) => (
              <button key={s} type="button" className="chip" onClick={() => setStatus(s)}
                style={{
                  cursor: "pointer", background: status === s ? "var(--pacific-soft)" : "#fff",
                  borderColor: status === s ? "var(--pacific)" : undefined,
                  fontWeight: status === s ? 700 : 600,
                }}>
                {s === "open" ? "Terbuka" : s === "resolved" ? "Selesai" : s === "dismissed" ? "Ditolak" : "Semua"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Memuat…</p>
        ) : reports.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Tidak ada laporan.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {reports.map((r) => {
              const link = targetLink(r);
              return (
                <div key={r.id} className="product-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "baseline", width: "100%" }}>
                    <Link href={link.href} style={{ fontWeight: 700, color: "var(--pacific)" }}>{link.label}</Link>
                    <span className="muted" style={{ fontSize: "0.78rem" }}>
                      oleh {r.reporter?.full_name ?? r.reporter?.username ?? "Pengguna"}
                    </span>
                    <span className="muted" style={{ fontSize: "0.78rem" }}>
                      {new Date(r.created_at).toLocaleString("id-ID")}
                    </span>
                    <span className="badge" style={{
                      marginLeft: "auto",
                      background: r.status === "open" ? "var(--orange-soft)" : r.status === "resolved" ? "var(--pacific-soft)" : "#f1f5f9",
                      color: r.status === "open" ? "var(--orange-dark)" : r.status === "resolved" ? "var(--pacific-dark)" : "#475569",
                    }}>
                      {r.status === "open" ? "Terbuka" : r.status === "resolved" ? "Selesai" : "Ditolak"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5 }}>{r.reason}</p>
                  <p className="muted" style={{ margin: 0, fontSize: "0.72rem" }}>target_id: <code>{r.target_id}</code></p>
                  {r.status === "open" && (
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem" }}>
                      <button type="button" onClick={() => void setReportStatus(r.id, "resolved")}
                        style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem", background: "var(--pacific)" }}>
                        ✓ Tandai Selesai
                      </button>
                      <button type="button" className="ghost" onClick={() => void setReportStatus(r.id, "dismissed")}
                        style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}>
                        ✕ Tolak
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
