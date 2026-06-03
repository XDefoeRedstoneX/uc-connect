"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AccountNav from "@/components/AccountNav";
import SkeletonList from "@/components/SkeletonList";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import EmptyStateUI from "@/components/ui/EmptyState";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type MyThread = {
  id: string; title: string; content: string; created_at: string;
  forum_categories: { name: string; slug: string } | null;
};
type MyReply = {
  id: string; thread_id: string; content: string; created_at: string;
  forum_threads: { id: string; title: string; forum_categories: { slug: string } | null } | null;
};

export default function MyThreadsPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<MyThread[]>([]);
  const [replies, setReplies] = useState<MyReply[]>([]);
  const [tab, setTab] = useState<"threads" | "replies">("threads");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      const res = await fetch("/api/profile/threads", { headers: { Authorization: `Bearer ${tok}` } });
      if (res.ok) { const j = await res.json(); setThreads(j.threads ?? []); setReplies(j.replies ?? []); }
      setLoading(false);
    };
    void init();
  }, [router]);

  if (loading) return (
    <SiteLayout title="Diskusi Saya | UC Connect">
      <AccountNav current="threads" />
      <section className="card compact-top"><SkeletonList rows={3} /></section>
    </SiteLayout>
  );

  return (
    <SiteLayout title="Diskusi Saya | UC Connect">
      <AccountNav current="threads" />
      <section className="hero">
        <span className="kicker" style={{ position: "relative", zIndex: 1 }}>
          <Icon name="chat" size={14} strokeWidth={2.6} /> Forum
        </span>
        <h1 className="display" style={{ position: "relative", zIndex: 1, fontSize: "var(--fs-h1)", margin: "0.5rem 0 0" }}>Diskusi Saya</h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1, marginTop: "0.5rem" }}>Thread dan balasan yang kamu buat di forum.</p>
      </section>

      <section style={{ marginTop: "1.75rem" }}>
        <div role="tablist" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {(["threads", "replies"] as const).map((tb) => (
            <button key={tb} type="button" role="tab" aria-selected={tab === tb} className="cat-pill"
              aria-pressed={tab === tb} onClick={() => setTab(tb)}>
              <Icon name={tb === "threads" ? "file-text" : "message-circle"} size={15} strokeWidth={2.2} />
              {tb === "threads" ? `Thread (${threads.length})` : `Balasan (${replies.length})`}
            </button>
          ))}
        </div>

        {tab === "threads" ? (
          threads.length === 0 ? (
            <EmptyState label="Belum ada thread." />
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {threads.map((t) => (
                <Link key={t.id} href={`/community/${t.forum_categories?.slug ?? "_"}/${t.id}`} className="dash-card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <p style={{ fontWeight: 700, margin: "0 0 0.2rem" }}>{t.title}</p>
                  <p className="muted" style={{ margin: "0 0 0.3rem", fontSize: "0.85rem" }}>{t.content.slice(0, 120)}{t.content.length > 120 ? "…" : ""}</p>
                  <div className="row-wrap" style={{ gap: "0.4rem", fontSize: "0.75rem" }}>
                    <span className="badge pacific">{t.forum_categories?.name ?? "—"}</span>
                    <span className="muted">{new Date(t.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          replies.length === 0 ? (
            <EmptyState label="Belum ada balasan." />
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {replies.map((r) => (
                <Link key={r.id} href={`/community/${r.forum_threads?.forum_categories?.slug ?? "_"}/${r.thread_id}`} className="dash-card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <p className="muted" style={{ margin: "0 0 0.2rem", fontSize: "0.78rem" }}>pada: {r.forum_threads?.title ?? "thread"}</p>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.88rem" }}>{r.content.slice(0, 150)}{r.content.length > 150 ? "…" : ""}</p>
                  <span className="muted" style={{ fontSize: "0.75rem" }}>{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                </Link>
              ))}
            </div>
          )
        )}
      </section>
    </SiteLayout>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <EmptyStateUI
      icon="chat"
      title={label}
      description="Mulai berdiskusi atau membalas thread di forum komunitas."
      action={<Button href="/community" iconRight="arrow-right">Ke Forum</Button>}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
