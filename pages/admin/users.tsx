"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AdminUser = {
  id: string; username: string | null; full_name: string | null;
  phone: string | null; avatar_url: string | null;
  role: "customer" | "vendor" | "admin"; updated_at: string;
};

const NAV = [
  { href: "/admin", label: "📊 Dashboard", id: "dash" },
  { href: "/admin/vendors", label: "🏪 Verifikasi Vendor", id: "vendors" },
  { href: "/admin/users", label: "👥 Users", id: "users" },
  { href: "/admin/forum", label: "💬 Forum", id: "forum" },
];

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  admin: { bg: "var(--orange-soft)", color: "var(--orange-dark)", label: "🛡 Admin" },
  vendor: { bg: "var(--pacific-soft)", color: "var(--pacific-dark)", label: "🏪 Vendor" },
  customer: { bg: "#f1f5f9", color: "#475569", label: "👤 Customer" },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<"" | "customer" | "vendor" | "admin">("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUsers(tok: string, role: string) {
    setLoading(true);
    const params = role ? `?role=${role}` : "";
    const res = await fetch(`/api/admin/users${params}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 403) { void router.replace("/unauthorized"); return; }
    if (res.ok) { const j = await res.json(); setUsers(j.users ?? []); }
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
      await loadUsers(tok, filter);
    };
    void init();
  }, [router]);

  useEffect(() => { if (token) void loadUsers(token, filter); }, [filter]);

  async function changeRole(userId: string, newRole: string) {
    if (!token) return;
    if (!confirm(`Ubah role user ini menjadi ${newRole}?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, role: newRole }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as AdminUser["role"] } : u));
    }
  }

  return (
    <SiteLayout title="User Management | Admin">
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", borderBottom: "2px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
        {NAV.map(n => (
          <Link key={n.id} href={n.href}
            style={{
              background: n.id === "users" ? "var(--gradient-main)" : "transparent",
              color: n.id === "users" ? "#fff" : "var(--muted)",
              border: "none", borderRadius: "8px", padding: "0.45rem 1rem",
              fontWeight: 700, fontSize: "0.88rem", textDecoration: "none",
            }}>
            {n.label}
          </Link>
        ))}
      </div>

      <div className="dash-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>👥 Users ({users.length})</h2>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {(["", "customer", "vendor", "admin"] as const).map(f => (
              <button key={f || "all"} type="button" className="chip" onClick={() => setFilter(f)}
                style={{
                  cursor: "pointer",
                  background: filter === f ? "var(--pacific-soft)" : "#fff",
                  borderColor: filter === f ? "var(--pacific)" : undefined,
                  fontWeight: filter === f ? 700 : 600,
                }}>
                {f === "" ? "Semua" : ROLE_BADGE[f].label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Memuat...</p>
        ) : users.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Tidak ada user ditemukan.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {users.map(u => {
              const rb = ROLE_BADGE[u.role];
              return (
                <div key={u.id} className="product-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--gradient-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>👤</div>}
                    <div>
                      <p style={{ fontWeight: 700, margin: 0, fontSize: "0.9rem" }}>{u.full_name ?? u.username ?? "—"}</p>
                      <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.8rem" }}>@{u.username ?? "no-username"} · {u.phone ?? "no phone"}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="badge" style={{ background: rb.bg, color: rb.color, fontSize: "0.78rem" }}>{rb.label}</span>
                    <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                      style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border)" }}>
                      <option value="customer">Customer</option>
                      <option value="vendor">Vendor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
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
