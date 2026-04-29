import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ForumCategory } from "@/types/domain";

type Props = {
  categories: ForumCategory[];
};

export default function CommunityPage({ categories }: Props) {
  return (
    <SiteLayout title="Forum Komunitas | UC Connect">
      <section className="card">
        <h1>Forum Komunitas</h1>
        <p>Diskusikan topik kampus, cari tim, atau tanya seputar layanan vendor di forum UC Connect.</p>

        <div className="stack compact-top" style={{ marginTop: '2rem' }}>
          {categories.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/community/${cat.slug}`} className="forum-category-card" style={{ textDecoration: 'none' }}>
                    <h2 className="forum-category-title">{cat.name}</h2>
                    {cat.description && (
                      <p className="forum-category-desc">{cat.description}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>Belum ada kategori forum saat ini.</p>
          )}
        </div>
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
