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
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const threadId = thread.id;
  const categorySlug = category.slug;

  async function submitReply(e: FormEvent) {
    e.preventDefault();
    if (!newReply.trim()) return;
    setSubmitError(null);
    setSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSubmitError("Layanan sementara tidak tersedia. Silakan muat ulang halaman.");
      setSubmitting(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      window.location.href = `/auth/login?redirect=/community/${categorySlug}/${threadId}`;
      setSubmitting(false);
      return;
    }

    const { data: authorProfile } = await supabase
      .from("profiles")
      .select("id,full_name,avatar_url")
      .eq("id", user.id)
      .single();

    const { data, error } = await supabase
      .from("forum_replies")
      .insert({ thread_id: threadId, author_id: user.id, content: newReply.trim() })
      .single();

    if (error) {
      console.error(error);
      setSubmitError("Gagal mengirim balasan.");
      setSubmitting(false);
      return;
    }

    setNewReply("");
    window.location.reload();
    return;
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
        <div style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
          Diposting oleh <strong>{thread.profiles?.full_name ?? 'Pengguna Anonim'}</strong> • {new Date(thread.created_at).toLocaleString('id-ID')}
        </div>

        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', marginBottom: '1.5rem' }}>{thread.content}</div>

        <form onSubmit={submitReply} style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Tulis Balasan</label>
          <textarea value={newReply} onChange={(e) => setNewReply(e.target.value)} rows={4} style={{ width: '100%' }} />
          {submitError && <p className="err">{submitError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Mengirim...' : 'Kirim Balasan'}</button>
          </div>
        </form>

        <h3 style={{ marginTop: 0 }}>{replies.length} Komentar</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {replies.length === 0 && <p style={{ color: 'var(--muted)' }}>Belum ada balasan untuk diskusi ini.</p>}
          {replies.map((r) => (
            <div key={r.id} className="reply-card">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div className="reply-avatar">
                  {r.profiles?.avatar_url && <img src={r.profiles.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div>
                  <div className="reply-author">{r.profiles?.full_name ?? 'Pengguna Anonim'}</div>
                  <div className="reply-time">{new Date(r.created_at).toLocaleString('id-ID')}</div>
                </div>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{r.content}</div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { slug, thread_id } = context.params as { slug?: string; thread_id?: string };
  if (!slug || !thread_id) {
    return { notFound: true };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return { props: { category: null, thread: null, replies: [] } };

  const { data: threadData, error: threadError } = await supabase
    .from('forum_threads')
    .select('id,category_id,author_id,title,content,view_count,created_at,updated_at')
    .eq('id', thread_id)
    .single();

  if (threadError) {
    console.error('Thread query error:', threadError, 'thread_id:', thread_id);
  }
  if (!threadData) {
    return {
      props: {
        category: null,
        thread: null,
        replies: [],
      },
    };
  }

  const { data: categoryData, error: categoryError } = await supabase
    .from('forum_categories')
    .select('*')
    .eq('id', threadData.category_id)
    .single();

  if (categoryError) {
    console.error('Category query error:', categoryError, 'category_id:', threadData.category_id);
    return { notFound: true };
  }
  if (!categoryData) {
    console.error('Category not found for thread category_id:', threadData.category_id);
    return { notFound: true };
  }

  if (categoryData.slug !== slug) {
    return {
      redirect: {
        destination: `/community/${categoryData.slug}/${threadData.id}`,
        permanent: false,
      },
    };
  }

  const { data: threadAuthor } = await supabase
    .from("profiles")
    .select("id,full_name,avatar_url")
    .eq("id", threadData.author_id)
    .single();

  const { data: repliesData } = await supabase
    .from('forum_replies')
    .select('id,thread_id,author_id,content,created_at')
    .eq('thread_id', thread_id)
    .order('created_at', { ascending: false });

  const replyAuthorIds = Array.from(new Set((repliesData ?? []).map((reply) => reply.author_id)));
  const { data: replyProfiles } = replyAuthorIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id,full_name,avatar_url")
        .in("id", replyAuthorIds)
    : { data: [] as Array<Pick<UserProfile, "id" | "full_name" | "avatar_url">> };

  const replyProfileMap = new Map((replyProfiles ?? []).map((profile) => [profile.id, profile]));
  const threadWithAuthor: ThreadWithAuthor = {
    ...(threadData as any),
    profiles: (threadAuthor as UserProfile | null) ?? null,
  };
  const repliesWithAuthors: ReplyWithAuthor[] = (repliesData ?? []).map((reply) => ({
    ...(reply as any),
    profiles: replyProfileMap.get(reply.author_id) ?? null,
  }));

  return {
    props: {
      category: categoryData as ForumCategory,
      thread: threadWithAuthor,
      replies: repliesWithAuthors,
    },
  };
};
