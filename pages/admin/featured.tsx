"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AdminNav from "@/components/admin/AdminNav";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Slot = {
  id: string; vendor_id: string; round_date: string; rank: number;
  amount_charged_idr: number; starts_at: string; ends_at: string;
  vendors: { name: string } | null;
};
type Bid = {
  id: string; vendor_id: string; round_date: string; amount_idr: number;
  status: string; created_at: string; vendors: { name: string } | null;
};

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function AdminFeaturedPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async (tok: string) => {
    setLoading(true);
    const res = await fetch("/api/admin/featured", { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 403) { void router.replace("/unauthorized"); return; }
    if (res.ok) {
      const j = await res.json();
      setSlots(j.activeSlots ?? []);
      setBids(j.activeBids ?? []);
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
      await load(tok);
    };
    void init();
  }, [router, load]);

  async function runSettlement() {
    if (!token) return;
    if (!confirm("Jalankan settlement untuk round besok sekarang? Saldo pemenang akan dipotong.")) return;
    setSettling(true);
    setMsg(null);
    const res = await fetch("/api/admin/featured/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(`Settlement selesai untuk ${j.round_date}: ${j.winners} pemenang.`);
      await load(token);
    } else {
      setMsg(j.error ?? "Gagal menjalankan settlement");
    }
    setSettling(false);
  }

  return (
    <SiteLayout title="Featured & Lelang | Admin">
      <AdminNav current="featured" />

      <div className="dash-card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ margin: 0 }}>🏆 Lelang Featured</h2>
            <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
              Lelang harian tertutup. pg_cron menjalankan settlement otomatis tiap 00:01. Tombol di bawah untuk menjalankan manual (mis. demo).
            </p>
          </div>
          <button type="button" disabled={settling} onClick={() => void runSettlement()}>
            {settling ? "Menjalankan…" : "▶ Jalankan Settlement"}
          </button>
        </div>
        {msg && <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "var(--pacific-dark)", fontSize: "0.88rem" }}>{msg}</p>}
      </div>

      <div className="dash-card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Slot Aktif ({slots.length})</h3>
        {loading ? <p className="muted">Memuat…</p> : slots.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>Belum ada vendor featured aktif.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {slots.map((s) => (
              <div key={s.id} className="product-row">
                <span style={{ fontWeight: 700 }}>#{s.rank} {s.vendors?.name ?? s.vendor_id}</span>
                <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--pacific-dark)" }}>{rupiah(s.amount_charged_idr)}</span>
                <span className="muted" style={{ fontSize: "0.78rem" }}>s/d {new Date(s.ends_at).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-card">
        <h3 style={{ marginTop: 0 }}>Bid Aktif untuk Round Berikutnya ({bids.length})</h3>
        {loading ? <p className="muted">Memuat…</p> : bids.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>Belum ada bid aktif.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {bids.map((b, i) => (
              <div key={b.id} className="product-row">
                <span style={{ color: i < 5 ? "var(--pacific-dark)" : "var(--muted)", fontWeight: 700 }}>
                  {i < 5 ? `🏅 #${i + 1}` : `#${i + 1}`}
                </span>
                <span>{b.vendors?.name ?? b.vendor_id}</span>
                <span style={{ marginLeft: "auto", fontWeight: 700 }}>{rupiah(b.amount_idr)}</span>
                <span className="muted" style={{ fontSize: "0.78rem" }}>round {b.round_date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
