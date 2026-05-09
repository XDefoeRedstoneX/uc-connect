"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ForumThread = {
  id: string; title: string; content: string; view_count: number;
  created_at: string; author_id: string;
  profiles: { username: string | null; full_name: string | null } | null;
  forum_categories: { name: string; slug: string } | null;
};
type ForumReply = {
  id: string; thread_id: string; content: string; created_at: string; author_id: string;
  profiles: { username: string | null; full_name: string | null } | null;
};

const NAV = [
  { href: "/admin", label: "📊 Dashboard", id: "dash" },
  { href: "/admin/vendors", label: "🏪 Verifikasi Vendor", id: "vendors" },
  { href: "/admin/users", label: "👥 Users", id: "users" },
  { href: "/admin/forum", label: "💬 Forum", id: "forum" },
];

export default function AdminForumPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<"threads" | "replies">("threads");
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(tok: string, type: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/forum?type=${type}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 403) { void router.replace("/unauthorized"); return; }
    if (res.ok) {
      const j = await res.json();
      if (type === "replies") setReplies(j.replies ?? []);
      else setThreads(j.threads ?? []);
    }
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
      await load(tok, tab);
    };
    void init();
  }, [router]);

  useEffect(() => { if (token) void load(token, tab); }, [tab]);

  async function remove(type: "thread" | "reply", id: string) {
    if (!token || !confirm(`Hapus ${type === "thread" ? "thread" : "balasan"} ini?`)) return;
    const res = await fetch("/api/admin/forum", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, id }),
    });
    if (res.ok) {
      if (type === "thread") setThreads(prev => prev.filter(t => t.id !== id));
      else setReplies(prev => prev.filter(r => r.id !== id));
    }
  }

  return (
    <SiteLayout title="Forum Moderation | Admin">
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", borderBottom: "2px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
        {NAV.map(n => (
          <Link key={n.id} href={n.href}
            style={{
              background: n.id === "forum" ? "var(--gradient-main)" : "transparent",
              color: n.id === "forum" ? "#fff" : "var(--muted)",
              border: "none", borderRadius: "8px", padding: "0.45rem 1rem",
              fontWeight: 700, fontSize: "0.88rem", textDecoration: "none",
            }}>
            {n.label}
          </Link>
        ))}
      </div>

      <div className="dash-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>💬 Forum Moderation</h2>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {(["threads", "replies"] as const).map(t => (
              <button key={t} type="button" className="chip" onClick={() => setTab(t)}
                style={{
                  cursor: "pointer", background: tab === t ? "var(--pacific-soft)" : "#fff",
                  borderColor: tab === t ? "var(--pacific)" : undefined,
                  fontWeight: tab === t ? 700 : 600,
                }}>
                {t === "threads" ? "📝 Threads" : "💬 Replies"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Memuat...</p>
        ) : tab === "threads" ? (
          threads.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Tidak ada thread.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {threads.map(t => (
                <div key={t.id} className="product-row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, margin: "0 0 0.2rem", fontSize: "0.95rem" }}>{t.title}</p>
                    <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0 0 0.3rem" }}>
                      {t.content.slice(0, 120)}{t.content.length > 120 ? "..." : ""}
                    </p>
                    <div className="row-wrap" style={{ gap: "0.4rem", fontSize: "0.78rem" }}>
                      <span className="badge pacific">{t.forum_categories?.name ?? "—"}</span>
                      <span style={{ color: "var(--muted)" }}>by @{t.profiles?.username ?? "anon"}</span>
                      <span style={{ color: "var(--muted)" }}>👁 {t.view_count}</span>
                      <span style={{ color: "var(--muted)" }}>{new Date(t.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                  <button onClick={() => remove("thread", t.id)}
                    style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem", background: "var(--error)", flexShrink: 0 }}>
                    🗑 Hapus
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          replies.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Tidak ada balasan.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {replies.map(r => (
                <div key={r.id} className="product-row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "0.9rem", margin: "0 0 0.2rem" }}>
                      {r.content.slice(0, 150)}{r.content.length > 150 ? "..." : ""}
                    </p>
                    <div className="row-wrap" style={{ gap: "0.4rem", fontSize: "0.78rem" }}>
                      <span style={{ color: "var(--muted)" }}>by @{r.profiles?.username ?? "anon"}</span>
                      <span style={{ color: "var(--muted)" }}>{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                  <button onClick={() => remove("reply", r.id)}
                    style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem", background: "var(--error)", flexShrink: 0 }}>
                    🗑 Hapus
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
