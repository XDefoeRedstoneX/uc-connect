import { FormEvent, useState } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ForumCategory, ForumThread, ForumReply, UserProfile } from "@/types/domain";

type ReplyWithAuthor = ForumReply & { profiles?: UserProfile | null };
type ThreadWithAuthor = ForumThread & { profiles?: UserProfile | null };

type Props = {
  category: ForumCategory | null;
  thread: ThreadWithAuthor | null;
  replies: ReplyWithAuthor[];
};

export default function ThreadPage({ category, thread, replies: initialReplies }: Props) {
  const [replies, setReplies] = useState<ReplyWithAuthor[]>(initialReplies);
  const [newReply, setNewReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!category || !thread) {
    return (
      <SiteLayout title="Diskusi Tidak Ditemukan | UC Connect">
        <section className="card" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h1 style={{ color: "var(--color-error, #ba1a1a)" }}>Diskusi Tidak Ditemukan</h1>
          <p>Maaf, diskusi yang Anda cari tidak tersedia.</p>
          <Link href="/community" style={{ color: "var(--color-primary, #00236f)", textDecoration: "underline" }}>
            Kembali ke Forum
          </Link>
        </section>
      </SiteLayout>
    );
  }

  async function submitReply(e: FormEvent) {
    e.preventDefault();
    if (!newReply.trim()) return;
    setSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      alert("Layanan tidak tersedia");
      setSubmitting(false);
      return;
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      window.location.href = `/auth/login?redirect=/community/${category?.slug ?? ''}/${thread!.id}`;
      return;
    }

    const { data, error } = await supabase
      .from("forum_replies")
      .insert({ thread_id: thread.id, author_id: user.id, content: newReply.trim() })
      .select("*, profiles!author_id(id,full_name,avatar_url)")
      .single();

    if (error) {
      console.error(error);
      alert("Gagal mengirim balasan.");
    } else if (data) {
      const added: ReplyWithAuthor = { ...(data as any), profiles: (data as any).profiles ?? null };
      setReplies((r) => [added, ...r]);
      setNewReply("");
    }

    setSubmitting(false);
  }

  return (
    <SiteLayout title={`${thread.title} | UC Connect`}>
      <section className="card" style={{ maxWidth: '880px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/community" style={{ color: "#3b82f6", textDecoration: "none" }}>Forum</Link>
          <span style={{ margin: '0 0.5rem' }}>{"/"}</span>
          <Link href={`/community/${category.slug}`} style={{ color: "#3b82f6", textDecoration: "none" }}>{category.name}</Link>
        </div>

        <h1 style={{ margin: '0 0 0.5rem' }}>{thread.title}</h1>
        <div style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Diposting oleh <strong>{thread.profiles?.full_name ?? 'Pengguna Anonim'}</strong> • {new Date(thread.created_at).toLocaleString('id-ID')}
        </div>

        <div style={{ whiteSpace: 'pre-wrap', color: '#374151', marginBottom: '1.5rem' }}>{thread.content}</div>

        <form onSubmit={submitReply} style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Tulis Balasan</label>
          <textarea value={newReply} onChange={(e) => setNewReply(e.target.value)} rows={4} style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #d1d5db' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Mengirim...' : 'Kirim Balasan'}</button>
          </div>
        </form>

        <h3 style={{ marginTop: 0 }}>{replies.length} Komentar</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {replies.length === 0 && <p style={{ color: '#6b7280' }}>Belum ada balasan untuk diskusi ini.</p>}
          {replies.map((r) => (
            <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', background: '#fff' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: '#e6eef8', overflow: 'hidden' }}>
                  {r.profiles?.avatar_url && <img src={r.profiles.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.profiles?.full_name ?? 'Pengguna Anonim'}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{new Date(r.created_at).toLocaleString('id-ID')}</div>
                </div>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{r.content}</div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { slug, thread_id } = context.params as { slug: string; thread_id: string };
  const supabase = getSupabaseServerClient();
  if (!supabase) return { props: { category: null, thread: null, replies: [] } };

  const { data: categoryData } = await supabase.from('forum_categories').select('*').eq('slug', slug).single();
  if (!categoryData) return { notFound: true };

  const { data: threadData } = await supabase
    .from('forum_threads')
    .select('*, profiles!author_id(id,full_name,avatar_url)')
    .eq('id', thread_id)
    .single();

  if (!threadData) return { notFound: true };

  const { data: repliesData } = await supabase
    .from('forum_replies')
    .select('*, profiles!author_id(id,full_name,avatar_url)')
    .eq('thread_id', thread_id)
    .order('created_at', { ascending: false });

  return {
    props: {
      category: categoryData as ForumCategory,
      thread: threadData as any,
      replies: (repliesData ?? []) as any,
    },
  };
};
