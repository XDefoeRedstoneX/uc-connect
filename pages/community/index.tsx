import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ForumCategory } from "@/types/domain";

const CATEGORY_ICONS: Record<string, string> = {
  "general": "💬",
  "vendor": "🏪",
  "event": "📅",
  "tips": "💡",
  "question": "❓",
  "announcement": "📢",
};

function getCategoryIcon(slug: string): string {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (slug.toLowerCase().includes(key)) return icon;
  }
  return "📁";
}

type Props = {
  categories: ForumCategory[];
};

export default function CommunityPage({ categories }: Props) {
  return (
    <SiteLayout title="Forum Komunitas | UC Connect" description="Diskusi dan tanya jawab antar mahasiswa di forum komunitas UC Connect.">
      {/* ── Hero ── */}
      <section className="hero bubble-section" aria-labelledby="community-title">
        <span className="badge pacific" style={{ marginBottom: "0.75rem", display: "inline-block" }}>
          🌐 Komunitas
        </span>
        <h1 id="community-title" style={{ position: "relative", zIndex: 1 }}>Forum Komunitas</h1>
        <p style={{ color: "var(--muted)", maxWidth: "36rem", position: "relative", zIndex: 1 }}>
          Diskusikan topik kampus, cari tim, atau tanya seputar layanan vendor di forum UC Connect.
        </p>
      </section>

      {/* ── Categories grid ── */}
      <section className="card compact-top" aria-label="Forum categories">
        {categories.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link href={`/community/${cat.slug}`} className="forum-category-card" style={{ textDecoration: "none", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <span style={{
                    fontSize: "1.75rem",
                    width: "3rem", height: "3rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "var(--radius-md)",
                    background: "var(--gradient-subtle)",
                    flexShrink: 0,
                  }}>
                    {getCategoryIcon(cat.slug)}
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
          <div style={{ textAlign: "center", padding: "3rem 1rem", background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</p>
            <p style={{ color: "var(--muted)" }}>Belum ada kategori forum saat ini.</p>
          </div>
        )}
      </section>
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
