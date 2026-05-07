import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ForumCategory } from "@/types/domain";
import type { Session } from "@supabase/supabase-js";

export default function NewDiscussion() {
  const router = useRouter();
  const { slug } = router.query;
  const supabase = getSupabaseBrowserClient();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load category and enforce active login session
  useEffect(() => {
    if (!router.isReady || !supabase) return;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!data.session) {
        void router.push(`/auth/login?redirect=/community/${slug}/new`);
      } else if (slug) {
        supabase
          .from("forum_categories")
          .select("*")
          .eq("slug", slug as string)
          .single()
          .then(({ data: catData }: { data: ForumCategory | null }) => setCategory(catData));
      }
    });
  }, [supabase, slug, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!category || !supabase) return;

    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("forum_threads").insert({
      category_id: category.id,
      author_id: userData.user.id,
      title: title.trim(),
      content: content.trim(),
    });

    if (insertError) {
      setError("Gagal membuat diskusi: " + insertError.message);
      setLoading(false);
    } else {
      void router.push(`/community/${slug}`);
    }
  };

  if (!category) {
    return (
      <SiteLayout title="Loading... | UC Connect">
        <section className="hero" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "2rem" }}>⏳</p>
          <p style={{ color: "var(--muted)" }}>Memuat forum...</p>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout title={`Buat Diskusi Baru: ${category.name} | UC Connect`}>
      <section className="card" style={{ maxWidth: "640px", margin: "0 auto" }}>
        <Link href={`/community/${slug}`} style={{ color: "var(--muted)", fontSize: "0.88rem", textDecoration: "none" }}>
          ← Kembali ke {category.name}
        </Link>
        <h1 style={{ margin: "0.75rem 0 0.35rem" }}>Buat Diskusi Baru</h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
          di kategori <strong style={{ color: "var(--pacific-dark)" }}>{category.name}</strong>
        </p>

        {error && <p className="err">{error}</p>}

        <form onSubmit={handleSubmit} className="stack" style={{ gap: "0.75rem" }}>
          <label>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Judul Diskusi *</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Dimana tempat fotocopy murah?"
              style={{ marginTop: "0.35rem" }}
            />
          </label>

          <label>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Isi Diskusi *</span>
            <textarea
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Jelaskan lebih detail disini..."
              style={{ marginTop: "0.35rem", width: "100%", resize: "vertical" }}
            />
          </label>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="submit" disabled={loading || !title || !content}>
              {loading ? "Menyimpan..." : "Posting Diskusi"}
            </button>
            <Link href={`/community/${slug}`} className="btn ghost">
              Batal
            </Link>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}