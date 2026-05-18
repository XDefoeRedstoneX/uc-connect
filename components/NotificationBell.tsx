"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Notification } from "@/types/domain";

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Resolve token once.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setToken(data.session?.access_token ?? null);
    })();
  }, []);

  const fetchNotifications = useCallback(async (tok: string) => {
    try {
      const res = await fetch("/api/notifications?limit=15", { headers: { Authorization: `Bearer ${tok}` } });
      if (!res.ok) return;
      const j = await res.json();
      setNotifs(j.notifications ?? []);
      setUnread(j.unread_count ?? 0);
    } catch {
      // network blip — ignore, next tick will retry
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void fetchNotifications(token);
    const id = setInterval(() => void fetchNotifications(token), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [token, fetchNotifications]);

  // Close dropdown on outside-click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAll() {
    if (!token || unread === 0) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ all: true }),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
  }

  async function markOne(id: string) {
    if (!token) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
  }

  if (!token) return null;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifikasi"
        className="nav-link"
        style={{
          background: "#fff",
          fontWeight: 700,
          color: "var(--pacific-dark)",
          position: "relative",
          padding: "0.35rem 0.55rem",
        }}
      >
        🔔
        {unread > 0 && (
          <span
            aria-label={`${unread} notifikasi belum dibaca`}
            style={{
              position: "absolute",
              top: 2, right: 2,
              minWidth: "16px", height: "16px", padding: "0 4px",
              borderRadius: "8px",
              background: "var(--orange)",
              color: "#fff",
              fontSize: "0.66rem",
              fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.45rem)",
            right: 0,
            width: "min(360px, 92vw)",
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
            zIndex: 60,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.85rem", borderBottom: "1px solid var(--border)" }}>
            <strong style={{ fontSize: "0.92rem" }}>Notifikasi</strong>
            {unread > 0 && (
              <button type="button" onClick={() => void markAll()}
                style={{ background: "none", border: "none", color: "var(--pacific)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <p style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
                Belum ada notifikasi.
              </p>
            ) : (
              notifs.map((n) => <NotifRow key={n.id} n={n} onClick={() => void markOne(n.id)} />)
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", padding: "0.5rem 0.85rem", textAlign: "center" }}>
            <Link href="/notifications" onClick={() => setOpen(false)}
              style={{ color: "var(--pacific)", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}>
              Lihat semua →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifRow({ n, onClick }: { n: Notification; onClick: () => void }) {
  const isUnread = !n.read_at;
  const { icon, message, href } = renderNotif(n);

  const content = (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        gap: "0.6rem",
        padding: "0.7rem 0.85rem",
        borderBottom: "1px solid var(--border)",
        background: isUnread ? "var(--pacific-soft)" : "#fff",
        cursor: href ? "pointer" : "default",
        transition: "background 0.15s",
      }}
    >
      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4, color: "var(--text)" }}>{message}</p>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "var(--muted)" }}>
          {timeAgo(n.created_at)}
        </p>
      </div>
      {isUnread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--orange)", marginTop: "0.3rem", flexShrink: 0 }} />}
    </div>
  );

  return href ? <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{content}</Link> : content;
}

function renderNotif(n: Notification): { icon: string; message: string; href: string | null } {
  const p = n.payload as Record<string, string | number | undefined>;
  switch (n.type) {
    case "review_received":
      return {
        icon: "⭐",
        message: `${p.reviewer_name ?? "Pelanggan"} memberi rating ${p.rating ?? "?"} untuk ${p.vendor_name ?? "vendormu"}.`,
        href: p.vendor_id ? `/directory/vendor/${p.vendor_id}` : null,
      };
    case "forum_reply":
      return {
        icon: "💬",
        message: `${p.replier_name ?? "Pengguna"} membalas thread "${p.thread_title ?? "milikmu"}".`,
        href: p.thread_id ? `/community/_/${p.thread_id}` : null,
      };
    case "vendor_approved":
      return {
        icon: "✅",
        message: `Vendor "${p.vendor_name ?? "kamu"}" sudah disetujui dan tampil di direktori.`,
        href: p.vendor_id ? `/directory/vendor/${p.vendor_id}` : "/vendor/dashboard",
      };
    case "content_removed":
      return {
        icon: "🗑",
        message: `Admin menghapus ${labelTarget(String(p.target_type ?? ""))}mu${p.preview ? `: "${truncate(String(p.preview), 50)}"` : ""}.`,
        href: null,
      };
    case "report_received":
      return {
        icon: "🚩",
        message: `Laporan baru untuk ${labelTarget(String(p.target_type ?? ""))}${p.preview ? `: "${truncate(String(p.preview), 50)}"` : ""}.`,
        href: "/admin/reports",
      };
    case "report_resolved":
      return {
        icon: p.status === "resolved" ? "✅" : "↩️",
        message: `Laporanmu (${labelTarget(String(p.target_type ?? ""))}) ${p.status === "resolved" ? "diselesaikan" : "ditolak"}.`,
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

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID");
}
