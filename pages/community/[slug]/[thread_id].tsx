import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import ReportButton from "@/components/ReportButton";
import { useToast } from "@/components/ToastProvider";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { compressAndResize } from "@/lib/compress-image";
import { ForumCategory, ForumThread, ForumReply, UserProfile } from "@/types/domain";

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const isWithinEditWindow = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;

// Links to the author's public profile when they have a username.
function AuthorLink({ username, children, style }: { username?: string | null; children: React.ReactNode; style?: React.CSSProperties }) {
  if (!username) return <span style={style}>{children}</span>;
  return <Link href={`/u/${username}`} style={{ textDecoration: "none", color: "inherit", ...style }}>{children}</Link>;
}

type ReplyWithAuthor = ForumReply & { profiles?: UserProfile | null };
type ThreadWithAuthor = ForumThread & { profiles?: UserProfile | null };

type Props = {
  category: ForumCategory | null;
  thread: ThreadWithAuthor | null;
  replies: ReplyWithAuthor[];
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

export default function ThreadPage({ category, thread: initialThread, replies: initialReplies }: Props) {
  const [thread, setThread] = useState<ThreadWithAuthor | null>(initialThread);
  const [replies, setReplies] = useState<ReplyWithAuthor[]>(initialReplies);
  const [newReply, setNewReply] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Inline edit state. We only edit one thing at a time, so a single discriminated value works.
  const [editing, setEditing] = useState<{ kind: "thread" } | { kind: "reply"; id: string } | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
    })();
  }, []);

  async function saveThreadEdit() {
    if (!thread) return;
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setSaving(false); return; }
    const { error } = await supabase.from("forum_threads").update({ content: editDraft.trim() }).eq("id", thread.id);
    if (error) {
      showToast("Gagal menyimpan perubahan.", "error");
    } else {
      setThread({ ...thread, content: editDraft.trim(), updated_at: new Date().toISOString() });
      setEditing(null);
      showToast("Thread diperbarui.");
    }
    setSaving(false);
  }

  async function deleteThread() {
    if (!thread) return;
    if (!confirm("Hapus thread ini? Semua balasan akan ikut dihapus.")) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from("forum_threads").delete().eq("id", thread.id);
    if (error) {
      showToast("Gagal menghapus thread.", "error");
      return;
    }
    showToast("Thread dihapus.");
    window.location.href = `/community/${category?.slug ?? ""}`;
  }

  async function saveReplyEdit(replyId: string) {
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setSaving(false); return; }
    const { error } = await supabase.from("forum_replies").update({ content: editDraft.trim() }).eq("id", replyId);
    if (error) {
      showToast("Gagal menyimpan perubahan.", "error");
    } else {
      setReplies((prev) => prev.map((r) => (r.id === replyId ? { ...r, content: editDraft.trim() } : r)));
      setEditing(null);
      showToast("Balasan diperbarui.");
    }
    setSaving(false);
  }

  async function deleteReply(replyId: string) {
    if (!confirm("Hapus balasan ini?")) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from("forum_replies").delete().eq("id", replyId);
    if (error) {
      showToast("Gagal menghapus balasan.", "error");
      return;
    }
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    showToast("Balasan dihapus.");
  }

  if (!category || !thread) {
    return (
      <SiteLayout title="Diskusi Tidak Ditemukan | UC Connect">
        <section className="card" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h1 style={{ color: "var(--error)" }}>Diskusi Tidak Ditemukan</h1>
          <p>Maaf, diskusi yang Anda cari tidak tersedia.</p>
          <Link href="/community" style={{ color: "var(--pacific)", textDecoration: "underline" }}>
            Kembali ke Forum
          </Link>
        </section>
      </SiteLayout>
    );
  }

  const threadId = thread.id;
  const categorySlug = category.slug;

  async function uploadReplyImage(userId: string, file: File): Promise<string | null> {
    const compressed = await compressAndResize(file, 1200, 900, 400);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const ext = compressed.type === "image/png" ? "png" : "jpg";
    const path = `${userId}/forum/${Date.now()}.${ext}`;
    // Use user's session token so Supabase Storage recognises the request as authenticated
    const supabase = getSupabaseBrowserClient();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const token = session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const res = await fetch(`${supabaseUrl}/storage/v1/object/forum-images/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": compressed.type, "x-upsert": "true" },
      body: compressed,
    });
    if (!res.ok) return null;
    return `${supabaseUrl}/storage/v1/object/public/forum-images/${path}`;
  }

  async function handleReplyImage(file: File | null) {
    if (!file) return;
    const compressed = await compressAndResize(file, 1200, 900, 400);
    setReplyImage(compressed);
    setReplyImagePreview(URL.createObjectURL(compressed));
  }

  async function submitReply(e: FormEvent) {
    e.preventDefault();
    if (!newReply.trim() && !replyImage) {
      setSubmitError("Pesan atau lampiran gambar tidak boleh kosong.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSubmitError("Layanan sementara tidak tersedia.");
      setSubmitting(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      window.location.href = `/auth/login?next=${encodeURIComponent(`/community/${categorySlug}/${threadId}`)}`;
      setSubmitting(false);
      return;
    }

    // Upload image if present
    let imageUrl: string | null = null;
    if (replyImage) {
      imageUrl = await uploadReplyImage(user.id, replyImage);
      if (!imageUrl) {
        setSubmitError("Gagal mengupload gambar. Pastikan bucket forum-images sudah dibuat dan public.");
        setSubmitting(false);
        return;
      }
    }

    const insertPayload: Record<string, unknown> = {
      thread_id: threadId,
      author_id: user.id,
      content: newReply.trim(),
    };
    if (imageUrl) insertPayload.image_url = imageUrl;

    const { error } = await supabase
      .from("forum_replies")
      .insert(insertPayload)
      .single();

    if (error) {
      console.error(error);
      setSubmitError("Gagal mengirim balasan.");
      setSubmitting(false);
      return;
    }

    showToast("Balasan berhasil dikirim!");
    setNewReply("");
    setReplyImage(null);
    setReplyImagePreview(null);
    window.location.reload();
  }

  return (
    <SiteLayout title={`${thread.title} | UC Connect`}>
      <section className="card" style={{ maxWidth: "880px", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav style={{ display: "flex", gap: "0.35rem", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
          <Link href="/community" style={{ color: "var(--pacific)", textDecoration: "none" }}>Forum</Link>
          <span>/</span>
          <Link href={`/community/${category.slug}`} style={{ color: "var(--pacific)", textDecoration: "none" }}>{category.name}</Link>
        </nav>

        {/* Original Post */}
        <div style={{
          padding: "1.25rem", borderRadius: "var(--radius-md)",
          background: "var(--pacific-soft)", border: "1px solid rgba(28,169,201,0.15)",
          marginBottom: "1.5rem",
        }}>
          <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.35rem" }}>{thread.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <AuthorLink username={thread.profiles?.username} style={{ display: "flex" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--gradient-main)", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
                overflow: "hidden",
              }}>
                {thread.profiles?.avatar_url
                  ? <img src={thread.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (thread.profiles?.full_name?.[0] ?? "?")
                }
              </div>
            </AuthorLink>
            <div>
              <AuthorLink username={thread.profiles?.username}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>{thread.profiles?.full_name ?? "Pengguna Anonim"}</p>
              </AuthorLink>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>{timeAgo(thread.created_at)}</p>
            </div>
          </div>
          {editing?.kind === "thread" ? (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={6} style={{ width: "100%" }} />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button type="button" className="ghost" disabled={saving} onClick={() => setEditing(null)}>Batal</button>
                <button type="button" disabled={saving || !editDraft.trim()} onClick={() => void saveThreadEdit()}>
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "var(--text)" }}>{thread.content}</div>
          )}
          {thread.image_url && (
            <img src={thread.image_url} alt="Lampiran"
              style={{ width: "100%", maxHeight: "400px", objectFit: "cover", borderRadius: "10px", marginTop: "1rem" }} />
          )}

          {/* Owner actions + report */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            {currentUserId === thread.author_id && !editing && (
              <>
                {isWithinEditWindow(thread.created_at) && (
                  <button type="button" className="ghost" style={{ fontSize: "0.78rem", padding: "0.25rem 0.6rem" }}
                    onClick={() => { setEditDraft(thread.content); setEditing({ kind: "thread" }); }}>
                    ✏️ Edit
                  </button>
                )}
                {isWithinEditWindow(thread.created_at) && (
                  <button type="button" style={{ fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "var(--error)" }}
                    onClick={() => void deleteThread()}>
                    🗑 Hapus
                  </button>
                )}
              </>
            )}
            {currentUserId && currentUserId !== thread.author_id && (
              <ReportButton targetType="thread" targetId={thread.id} />
            )}
          </div>
        </div>

        {/* Reply Form */}
        <form onSubmit={submitReply} style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", marginTop: 0, marginBottom: "0.5rem" }}>💬 Tulis Balasan</h3>
          <textarea value={newReply} onChange={(e) => setNewReply(e.target.value)} rows={3} placeholder="Bagikan pendapatmu..."
            style={{ width: "100%", marginBottom: "0.5rem" }} />

          {/* Image attachment */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="ghost" onClick={() => imageRef.current?.click()}
              style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              📷 Lampirkan Gambar
            </button>
            <input ref={imageRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => handleReplyImage(e.target.files?.[0] ?? null)} />
            {replyImagePreview && (
              <>
                <img src={replyImagePreview} alt="Preview" style={{ height: "40px", borderRadius: "6px", objectFit: "cover" }} />
                <button type="button" onClick={() => { setReplyImage(null); setReplyImagePreview(null); }}
                  style={{ background: "var(--error)", fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>✕</button>
              </>
            )}
          </div>

          {submitError && <p className="err" style={{ marginTop: "0.5rem" }}>{submitError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
            <button type="submit" disabled={submitting}>{submitting ? "Mengirim..." : "Kirim Balasan"}</button>
          </div>
        </form>

        {/* Replies */}
        <h3 style={{ marginTop: 0, fontSize: "1rem" }}>{replies.length} Balasan</h3>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {replies.length === 0 && <p style={{ color: "var(--muted)" }}>Belum ada balasan. Jadilah yang pertama!</p>}
          {replies.map((r) => (
            <div key={r.id} style={{
              padding: "1rem", borderRadius: "var(--radius-md)",
              background: "var(--bg)", border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                <AuthorLink username={r.profiles?.username} style={{ display: "flex" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "var(--gradient-subtle)", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--muted)", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0,
                    overflow: "hidden",
                  }}>
                    {r.profiles?.avatar_url
                      ? <img src={r.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (r.profiles?.full_name?.[0] ?? "?")
                    }
                  </div>
                </AuthorLink>
                <div>
                  <AuthorLink username={r.profiles?.username}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{r.profiles?.full_name ?? "Pengguna Anonim"}</span>
                  </AuthorLink>
                  <span style={{ color: "var(--muted)", fontSize: "0.78rem", marginLeft: "0.5rem" }}>{timeAgo(r.created_at)}</span>
                </div>
              </div>
              {editing?.kind === "reply" && editing.id === r.id ? (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={3} style={{ width: "100%" }} />
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button type="button" className="ghost" disabled={saving} onClick={() => setEditing(null)}>Batal</button>
                    <button type="button" disabled={saving || !editDraft.trim()} onClick={() => void saveReplyEdit(r.id)}>
                      {saving ? "Menyimpan…" : "Simpan"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--text)" }}>{r.content}</div>
              )}
              {r.image_url && (
                <img src={r.image_url} alt="Lampiran"
                  style={{ width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "8px", marginTop: "0.75rem" }} />
              )}

              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                {currentUserId === r.author_id && !(editing?.kind === "reply" && editing.id === r.id) && (
                  <>
                    {isWithinEditWindow(r.created_at) && (
                      <button type="button" className="ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}
                        onClick={() => { setEditDraft(r.content); setEditing({ kind: "reply", id: r.id }); }}>
                        ✏️ Edit
                      </button>
                    )}
                    {isWithinEditWindow(r.created_at) && (
                      <button type="button" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", background: "var(--error)" }}
                        onClick={() => void deleteReply(r.id)}>
                        🗑 Hapus
                      </button>
                    )}
                  </>
                )}
                {currentUserId && currentUserId !== r.author_id && (
                  <ReportButton targetType="reply" targetId={r.id} />
                )}
              </div>
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
    .from("forum_threads")
    .select("id,category_id,author_id,title,content,image_url,view_count,created_at,updated_at")
    .eq("id", thread_id)
    .single();

  if (threadError) {
    console.error("Thread query error:", threadError, "thread_id:", thread_id);
  }
  if (!threadData) {
    return { props: { category: null, thread: null, replies: [] } };
  }

  const { data: categoryData, error: categoryError } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("id", threadData.category_id)
    .single();

  if (categoryError || !categoryData) {
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
    .select("id,full_name,avatar_url,username")
    .eq("id", threadData.author_id)
    .single();

  const { data: repliesData } = await supabase
    .from("forum_replies")
    .select("id,thread_id,author_id,content,image_url,created_at")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true });

  const replyAuthorIds = Array.from(new Set((repliesData ?? []).map((reply) => reply.author_id)));
  const { data: replyProfiles } = replyAuthorIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id,full_name,avatar_url,username")
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
