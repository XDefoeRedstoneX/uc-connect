import Link from "next/link";
import { GetServerSideProps } from "next";
import { useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Reveal from "@/components/ui/Reveal";
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
        <EmptyState
          icon="search"
          title="Kategori Tidak Ditemukan"
          description="Maaf, kategori yang Anda cari tidak tersedia."
          action={<Button href="/community" variant="secondary" icon="arrow-left">Kembali ke Forum</Button>}
        />
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
      <Reveal as="section" className="hero">
        <Link href="/community" className="back-link" style={{ position: "relative", zIndex: 1 }}>
          <Icon name="arrow-left" size={15} /> Kembali ke Forum
        </Link>
        <h1 className="display" style={{ position: "relative", zIndex: 1, marginTop: "0.6rem", fontSize: "var(--fs-h1)" }}>{category.name}</h1>
        {category.description && <p style={{ color: "var(--muted)", position: "relative", zIndex: 1, marginTop: "0.5rem", maxWidth: "52ch" }}>{category.description}</p>}
      </Reveal>

      {/* Search + New Thread */}
      <section style={{ marginTop: "1.75rem" }}>
        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div className="explore-search" style={{ flex: 1, minWidth: "220px", margin: 0 }}>
            <Icon name="search" size={18} className="search-ico" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari diskusi..."
              aria-label="Cari diskusi"
            />
          </div>
          <Button href={`/community/${category.slug}/new`} icon="plus">Diskusi Baru</Button>
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.85rem", fontWeight: 600 }}>
          {query ? `${filtered.length} hasil ditemukan` : `${threads.length} diskusi`}
        </p>

        {/* Thread list */}
        {filtered.length > 0 ? (
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {filtered.map((thread) => {
              const replyCount = thread.forum_replies?.[0]?.count ?? 0;
              return (
                <Link key={thread.id} href={`/community/${category.slug}/${thread.id}`} className="thread-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="thread-row__title clamp-1">{thread.title}</h3>
                    <p className="thread-row__snippet clamp-2">{thread.content}</p>
                    {thread.image_url && (
                      <img src={thread.image_url} alt=""
                        style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "10px", margin: "0.5rem 0" }} />
                    )}
                    <div className="thread-row__meta">
                      <span><Icon name="message-circle" size={14} /> {replyCount} balasan</span>
                      <span><Icon name="eye" size={14} /> {thread.view_count} dilihat</span>
                      <span>{timeAgo(thread.created_at)}</span>
                    </div>
                  </div>
                  <Icon name="chevron-right" size={18} className="thread-row__arrow" />
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="chat"
            title={query ? "Tidak ada diskusi yang cocok" : "Belum ada diskusi"}
            description={query ? "Coba kata kunci lain." : "Jadilah yang pertama memulai diskusi di kategori ini."}
            action={!query ? <Button href={`/community/${category.slug}/new`} icon="plus">Mulai Diskusi Baru</Button> : undefined}
          />
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
