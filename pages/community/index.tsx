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
                <li key={cat.id} style={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  padding: '1.5rem',
                  transition: 'box-shadow 0.2s'
                }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>
                    <Link href={`/community/${cat.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {cat.name}
                    </Link>
                  </h2>
                  {cat.description && (
                    <p style={{ margin: '0.5rem 0 0', color: '#4b5563' }}>{cat.description}</p>
                  )}
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
