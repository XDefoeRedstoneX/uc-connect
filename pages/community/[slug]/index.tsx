import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ForumCategory, ForumThread } from "@/types/domain";

type Props = {
  category: ForumCategory | null;
  threads: ForumThread[];
};

export default function CategoryPage({ category, threads }: Props) {
  if (!category) {
    return (
      <SiteLayout title="Kategori Tidak Ditemukan | UC Connect">
        <section className="card" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h1 style={{ color: "var(--color-error, #ba1a1a)" }}>Kategori Tidak Ditemukan</h1>
          <p>Maaf, kategori yang Anda cari tidak tersedia.</p>
          <Link href="/community" style={{ color: "var(--color-primary, #00236f)", textDecoration: "underline" }}>
            Kembali ke Forum
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout title={`${category.name} | UC Connect`}>
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <Link href="/community" style={{ color: "#3b82f6", textDecoration: "none", marginBottom: "0.5rem", display: "inline-block" }}>
              &larr; Kembali ke Forum
            </Link>
            <h1 style={{ margin: "0.5rem 0 0" }}>{category.name}</h1>
            {category.description && <p style={{ color: '#4b5563', margin: 0 }}>{category.description}</p>}
          </div>
          
          <Link href={`/community/${category.slug}/new`} className="btn" style={{ whiteSpace: 'nowrap' }}>
            + Tambah Diskusi
          </Link>
        </div>

        <div className="stack compact-top">
          {threads.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
              {threads.map((thread) => (
                <li key={thread.id} className="thread-card">
                  <h2>
                    <Link href={`/community/${category.slug}/${thread.id}`}>
                      {thread.title}
                    </Link>
                  </h2>
                  <p className="thread-meta">
                    {thread.forum_replies?.[0]?.count ?? 0} Komentar • {new Date(thread.created_at).toLocaleDateString('id-ID')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ textAlign: "center", padding: "2rem", background: 'var(--gradient-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--muted)' }}>
              Belum ada diskusi di kategori ini. Jadilah yang pertama!
            </p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const slug = context.params?.slug as string;
  const supabase = getSupabaseServerClient();
  
  if (!supabase || !slug) return { props: { category: null, threads: [] } };

  // Fetch category details
  const { data: categoryData } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!categoryData) {
    return { notFound: true };
  }

  // Fetch all threads within that category, include replies count
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