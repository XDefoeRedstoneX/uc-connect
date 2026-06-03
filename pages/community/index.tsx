import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import Icon, { type IconName } from "@/components/ui/Icon";
import EmptyState from "@/components/ui/EmptyState";
import Reveal from "@/components/ui/Reveal";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ForumCategory } from "@/types/domain";

const CATEGORY_ICONS: Record<string, IconName> = {
  general: "chat",
  vendor: "store",
  event: "calendar",
  tips: "sparkles",
  question: "file-text",
  announcement: "bell",
};

function getCategoryIcon(slug: string): IconName {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (slug.toLowerCase().includes(key)) return icon;
  }
  return "grid";
}

type Props = {
  categories: ForumCategory[];
};

export default function CommunityPage({ categories }: Props) {
  return (
    <SiteLayout title="Forum Komunitas | UC Connect" description="Diskusi dan tanya jawab antar mahasiswa di forum komunitas UC Connect.">
      {/* ── Hero ── */}
      <Reveal as="section" className="hero" aria-labelledby="community-title">
        <span className="kicker" style={{ position: "relative", zIndex: 1 }}>
          <Icon name="users" size={14} strokeWidth={2.6} />
          Komunitas
        </span>
        <h1 id="community-title" className="display" style={{ position: "relative", zIndex: 1, fontSize: "var(--fs-h1)", margin: "0.5rem 0 0" }}>
          Forum Komunitas
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: "40ch", position: "relative", zIndex: 1, marginTop: "0.6rem" }}>
          Diskusikan topik kampus, cari tim, atau tanya seputar layanan vendor di forum UC Connect.
        </p>
      </Reveal>

      {/* ── Categories grid ── */}
      <Reveal as="section" index={1} aria-label="Forum categories" style={{ marginTop: "2rem" }}>
        {categories.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.85rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link href={`/community/${cat.slug}`} className="forum-category-card" style={{ textDecoration: "none", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <span style={{
                    width: "3rem", height: "3rem",
                    display: "grid", placeItems: "center",
                    borderRadius: "var(--radius-md)",
                    background: "var(--gradient-subtle)",
                    color: "var(--pacific-dark)",
                    flexShrink: 0,
                  }}>
                    <Icon name={getCategoryIcon(cat.slug)} size={24} strokeWidth={2} />
                  </span>
                  <div>
                    <h2 className="forum-category-title">{cat.name}</h2>
                    {cat.description && (
                      <p className="forum-category-desc">{cat.description}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="chat"
            title="Belum ada kategori"
            description="Belum ada kategori forum saat ini."
          />
        )}
      </Reveal>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { props: { categories: [] } };

  const { data } = await supabase
    .from("forum_categories")
    .select("*")
    .order("created_at", { ascending: true });

  return {
    props: {
      categories: (data ?? []) as ForumCategory[],
    },
  };
};
