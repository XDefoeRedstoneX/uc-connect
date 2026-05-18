"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AdminNav from "@/components/admin/AdminNav";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AdminVendor = {
  id: string; slug: string; name: string; tagline: string | null;
  category: string | null; city: string | null; whatsapp: string | null;
  is_verified: boolean; created_at: string; owner_id: string | null;
  university: string | null; ktm_url: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

export default function AdminVendorsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "verified" | "all">("pending");
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadVendors(tok: string, status: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/vendors?status=${status}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 403) { void router.replace("/unauthorized"); return; }
    if (res.ok) { const j = await res.json(); setVendors(j.vendors ?? []); }
    setLoading(false);
  }

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      setToken(tok);
      await loadVendors(tok, filter);
    };
    void init();
  }, [router]);

  useEffect(() => { if (token) void loadVendors(token, filter); }, [filter]);

  async function act(vendorId: string, action: "approve" | "reject") {
    if (!token) return;
    if (action === "reject" && !confirm("Yakin ingin menolak dan menghapus vendor ini?")) return;
    setActionId(vendorId);
    const res = await fetch("/api/admin/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vendor_id: vendorId, action }),
    });
    if (res.ok) {
      setVendors(prev => prev.filter(v => action === "reject" ? v.id !== vendorId : true)
        .map(v => v.id === vendorId ? { ...v, is_verified: true } : v));
    }
    setActionId(null);
  }

  return (
    <SiteLayout title="Verifikasi Vendor | Admin">
      <AdminNav current="vendors" />

      <div className="dash-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>🏪 Vendor Management</h2>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {(["pending", "verified", "all"] as const).map(f => (
              <button key={f} type="button" className="chip" onClick={() => setFilter(f)}
                style={{
                  cursor: "pointer",
                  background: filter === f ? "var(--pacific-soft)" : "#fff",
                  borderColor: filter === f ? "var(--pacific)" : undefined,
                  fontWeight: filter === f ? 700 : 600,
                }}>
                {f === "pending" ? "⏳ Pending" : f === "verified" ? "✓ Verified" : "📋 Semua"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Memuat...</p>
        ) : vendors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</p>
            <p style={{ color: "var(--muted)" }}>{filter === "pending" ? "Tidak ada vendor menunggu verifikasi." : "Tidak ada vendor ditemukan."}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {vendors.map(v => (
              <div key={v.id} className="product-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <p className="product-name" style={{ margin: 0 }}>{v.name}</p>
                    {v.is_verified
                      ? <span className="badge success" style={{ fontSize: "0.72rem" }}>✓ Verified</span>
                      : <span className="badge" style={{ background: "var(--orange-soft)", color: "var(--orange-dark)", fontSize: "0.72rem" }}>⏳ Pending</span>}
                  </div>
                  {v.tagline && <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0 0 0.25rem" }}>{v.tagline}</p>}
                  <div className="row-wrap" style={{ gap: "0.35rem", fontSize: "0.8rem" }}>
                    {v.category && <span className="badge pacific">{v.category}</span>}
                    {v.university && <span className="badge pacific">🎓 {v.university}</span>}
                    {v.city && <span className="badge pacific">📍 {v.city}</span>}
                    {v.whatsapp && <span style={{ color: "var(--muted)" }}>📱 {v.whatsapp}</span>}
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.35rem" }}>
                    Owner: {v.profiles?.full_name ?? v.profiles?.email ?? "—"} · {new Date(v.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  {!v.is_verified && (
                    <>
                      <button onClick={() => act(v.id, "approve")} disabled={actionId === v.id}
                        style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => act(v.id, "reject")} disabled={actionId === v.id}
                        style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem", background: "var(--error)" }}>
                        ✕ Reject
                      </button>
                    </>
                  )}
                  {v.ktm_url && (
                    <a href={v.ktm_url} target="_blank" rel="noopener noreferrer" className="btn ghost"
                      style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}>
                      🪪 Lihat KTM
                    </a>
                  )}
                  <Link href={`/directory/vendor/${v.id}`} className="btn ghost"
                    style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}>
                    👁 View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
