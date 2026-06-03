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
  target_url: string | null;
  target_preview: string | null;
  target_exists: boolean;
};

const TARGET_LABEL: Record<ReportTargetType, string> = {
  vendor: "🏪 Vendor",
  review: "⭐ Ulasan",
  thread: "📝 Thread",
  reply: "💬 Balasan",
};

const MODERATION_FALLBACK: Record<ReportTargetType, string> = {
  vendor: "/admin/vendors",
  review: "/admin/reviews",
  thread: "/admin/forum",
  reply: "/admin/forum?type=replies",
};

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
      // On the "all" tab the row stays but flips status; on filtered tabs it
      // leaves the current view. Update locally so the screen stays in sync.
      setReports((prev) =>
        status === "all"
          ? prev.map((r) =>
              r.id === reportId
                ? { ...r, status: newStatus, resolved_at: new Date().toISOString() }
                : r,
            )
          : prev.filter((r) => r.id !== reportId),
      );
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
              const label = TARGET_LABEL[r.target_type];
              const href = r.target_url ?? MODERATION_FALLBACK[r.target_type];
              return (
                <div key={r.id} className="product-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "baseline", width: "100%" }}>
                    <Link href={href} style={{ fontWeight: 700, color: "var(--pacific)" }}>{label}</Link>
                    {!r.target_exists && (
                      <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", fontSize: "0.7rem" }}>
                        konten dihapus
                      </span>
                    )}
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
                  {r.target_preview && (
                    <p className="muted" style={{ margin: 0, fontSize: "0.82rem", fontStyle: "italic" }}>
                      &ldquo;{r.target_preview}&rdquo;
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5 }}>{r.reason}</p>
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
