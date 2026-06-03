"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Notification } from "@/types/domain";

export default function NotificationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (tok: string, f: typeof filter) => {
    setLoading(true);
    const res = await fetch(`/api/notifications?limit=200${f === "unread" ? "&unread=1" : ""}`,
      { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) {
      const j = await res.json();
      setNotifs(j.notifications ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      setToken(tok);
      await load(tok, filter);
    };
    void init();
  }, [router, load, filter]);

  async function markAll() {
    if (!token) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ all: true }),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  async function markOne(id: string) {
    if (!token) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
  }

  return (
    <SiteLayout title="Notifikasi | UC Connect">
      <div className="card" style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          <h1 style={{ margin: 0 }}>🔔 Notifikasi</h1>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {(["all", "unread"] as const).map((f) => (
              <button key={f} type="button" className="chip" onClick={() => setFilter(f)}
                style={{
                  cursor: "pointer", background: filter === f ? "var(--pacific-soft)" : "#fff",
                  borderColor: filter === f ? "var(--pacific)" : undefined,
                  fontWeight: filter === f ? 700 : 600,
                }}>
                {f === "all" ? "Semua" : "Belum Dibaca"}
              </button>
            ))}
            <button type="button" onClick={() => void markAll()} className="ghost" style={{ fontSize: "0.82rem" }}>
              Tandai semua dibaca
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>Memuat…</p>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ fontSize: "2.5rem", margin: "0 0 0.5rem" }}>📭</p>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              {filter === "unread" ? "Tidak ada notifikasi belum dibaca." : "Belum ada notifikasi."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {notifs.map((n) => <Row key={n.id} n={n} onClick={() => void markOne(n.id)} />)}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function Row({ n, onClick }: { n: Notification; onClick: () => void }) {
  const isUnread = !n.read_at;
  const { icon, message, href } = renderNotif(n);

  const body = (
    <div
      onClick={onClick}
      style={{
        display: "flex", gap: "0.75rem", padding: "0.85rem 1rem",
        borderRadius: "var(--radius-md)",
        background: isUnread ? "var(--pacific-soft)" : "var(--bg)",
        border: `1px solid ${isUnread ? "var(--pacific-light, rgba(28,169,201,0.25))" : "var(--border)"}`,
        cursor: href ? "pointer" : "default",
      }}
    >
      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text)" }}>{message}</p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>
          {new Date(n.created_at).toLocaleString("id-ID")}
        </p>
      </div>
      {isUnread && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--orange)", marginTop: "0.4rem", flexShrink: 0 }} />}
    </div>
  );

  return href ? <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{body}</Link> : body;
}

function renderNotif(n: Notification): { icon: string; message: string; href: string | null } {
  const p = n.payload as Record<string, string | number | undefined>;
  switch (n.type) {
    case "review_received":
      return {
        icon: "⭐",
        message: `${p.reviewer_name ?? "Pelanggan"} memberi rating ${p.rating ?? "?"} bintang untuk ${p.vendor_name ?? "vendormu"}${p.preview ? `: "${p.preview}"` : ""}.`,
        href: p.vendor_id ? `/directory/vendor/${p.vendor_id}` : null,
      };
    case "review_replied":
      return {
        icon: "💬",
        message: `${p.vendor_name ?? "Vendor"} membalas ulasanmu${p.preview ? `: "${p.preview}"` : ""}.`,
        href: p.vendor_id ? `/directory/vendor/${p.vendor_id}` : null,
      };
    case "forum_reply":
      return {
        icon: "💬",
        message: `${p.replier_name ?? "Pengguna"} membalas thread "${p.thread_title ?? "milikmu"}".`,
        href: p.thread_id && p.category_slug ? `/community/${p.category_slug}/${p.thread_id}` : null,
      };
    case "vendor_approved":
      return {
        icon: "✅",
        message: `Vendor "${p.vendor_name ?? "kamu"}" sudah disetujui admin dan tampil di direktori.`,
        href: p.vendor_id ? `/directory/vendor/${p.vendor_id}` : "/vendor/dashboard",
      };
    case "content_removed":
      return {
        icon: "🗑",
        message: `Admin menghapus ${labelTarget(String(p.target_type ?? ""))}mu${p.preview ? `: "${p.preview}"` : ""}.`,
        href: null,
      };
    case "report_received":
      return {
        icon: "🚩",
        message: `Laporan baru untuk ${labelTarget(String(p.target_type ?? ""))}${p.preview ? `: "${p.preview}"` : ""}.`,
        href: "/admin/reports",
      };
    case "report_resolved":
      return {
        icon: p.status === "resolved" ? "✅" : "↩️",
        message: `Laporanmu (${labelTarget(String(p.target_type ?? ""))}) ${p.status === "resolved" ? "diselesaikan oleh admin" : "ditolak oleh admin"}.`,
        href: null,
      };
    case "bid_won":
      return {
        icon: "🏆",
        message: `Bid featured-mu menang (peringkat #${p.rank ?? "?"})! Vendormu tampil di Beranda & atas Jelajahi selama 24 jam. Saldo dipotong Rp${Number(p.amount ?? 0).toLocaleString("id-ID")}.`,
        href: p.vendor_id ? `/directory/vendor/${p.vendor_id}` : "/vendor/dashboard",
      };
    case "bid_lost":
      return {
        icon: "📉",
        message: p.reason === "insufficient_balance"
          ? "Bid featured-mu gagal karena saldo tidak cukup saat settlement. Top up & bid lagi."
          : "Bid featured-mu kalah di lelang kali ini. Coba naikkan bid untuk round berikutnya.",
        href: "/vendor/dashboard",
      };
    case "topup_credited":
      return {
        icon: "💰",
        message: `Top-up berhasil. Saldo bertambah Rp${Number(p.amount ?? 0).toLocaleString("id-ID")}.`,
        href: "/vendor/dashboard",
      };
    default:
      return {
        icon: "🔔",
        message: `Notifikasi baru (${n.type}).`,
        href: null,
      };
  }
}

function labelTarget(t: string): string {
  switch (t) {
    case "vendor": return "vendor";
    case "review": return "ulasan";
    case "thread": return "thread";
    case "reply":  return "balasan";
    default: return "konten";
  }
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
