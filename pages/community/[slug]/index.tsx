import Link from "next/link";
import { GetServerSideProps } from "next";
import { useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ForumCategory, ForumThread } from "@/types/domain";

type Props = {
  category: ForumCategory | null;
  threads: ForumThread[];
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID");
}

export default function CategoryPage({ category, threads }: Props) {
  const [query, setQuery] = useState("");

  if (!category) {
    return (
      <SiteLayout title="Kategori Tidak Ditemukan | UC Connect">
        <section className="card" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h1 style={{ color: "var(--error)" }}>Kategori Tidak Ditemukan</h1>
          <p>Maaf, kategori yang Anda cari tidak tersedia.</p>
          <Link href="/community" style={{ color: "var(--pacific)", textDecoration: "underline" }}>
            Kembali ke Forum
          </Link>
        </section>
      </SiteLayout>
    );
  }

  const filtered = query.trim()
    ? threads.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.content.toLowerCase().includes(query.toLowerCase())
      )
    : threads;

  return (
    <SiteLayout title={`${category.name} | UC Connect`} description={category.description ?? `Diskusi seputar ${category.name} di UC Connect.`}>
      {/* Hero */}
      <section className="hero bubble-section">
        <Link href="/community" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.88rem", position: "relative", zIndex: 1 }}>
          ← Kembali ke Forum
        </Link>
        <h1 style={{ position: "relative", zIndex: 1, marginTop: "0.5rem" }}>{category.name}</h1>
        {category.description && <p style={{ color: "var(--muted)", position: "relative", zIndex: 1 }}>{category.description}</p>}
      </section>

      {/* Search + New Thread */}
      <section className="card compact-top">
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Cari diskusi..."
            style={{ flex: 1, minWidth: "200px" }}
          />
          <Link href={`/community/${category.slug}/new`} className="btn" style={{ whiteSpace: "nowrap" }}>
            + Diskusi Baru
          </Link>
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          {query ? `${filtered.length} hasil ditemukan` : `${threads.length} diskusi`}
        </p>

        {/* Thread list */}
        {filtered.length > 0 ? (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {filtered.map((thread) => {
              const replyCount = thread.forum_replies?.[0]?.count ?? 0;
              const snippet = thread.content.length > 120
                ? thread.content.slice(0, 120) + "..."
                : thread.content;

              return (
                <Link key={thread.id} href={`/community/${category.slug}/${thread.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{
                    padding: "1rem 1.15rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(28,169,201,0.3)"; e.currentTarget.style.background = "var(--pacific-soft)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700 }}>{thread.title}</h3>
                        <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.5, margin: "0 0 0.5rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {snippet}
                        </p>
                        {thread.image_url && (
                          <img src={thread.image_url} alt=""
                            style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "8px", marginBottom: "0.5rem" }} />
                        )}
                        <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.78rem", color: "var(--muted)" }}>
                          <span>💬 {replyCount} balasan</span>
                          <span>👁 {thread.view_count} dilihat</span>
                          <span>{timeAgo(thread.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: "center", padding: "3rem 1rem",
            background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)",
          }}>
            <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>💬</p>
            <p style={{ color: "var(--muted)", marginBottom: "0.75rem" }}>
              {query ? "Tidak ada diskusi yang cocok." : "Belum ada diskusi. Jadilah yang pertama!"}
            </p>
            {!query && (
              <Link href={`/community/${category.slug}/new`} className="btn">
                Mulai Diskusi Baru
              </Link>
            )}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const slug = context.params?.slug as string;
  const supabase = getSupabaseServerClient();

  if (!supabase || !slug) return { props: { category: null, threads: [] } };

  const { data: categoryData } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!categoryData) {
    return { notFound: true };
  }

  const { data: threadsData } = await supabase
    .from("forum_threads")
    .select("*, forum_replies(count)")
    .eq("category_id", categoryData.id)
    .order("created_at", { ascending: false });

  return {
    props: {
      category: categoryData as ForumCategory,
      threads: (threadsData ?? []) as ForumThread[],
    },
  };
};