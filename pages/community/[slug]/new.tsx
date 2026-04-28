import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ForumCategory } from "@/types/domain";

export default function NewDiscussion() {
  const router = useRouter();
  const { slug } = router.query;
  const supabase = getSupabaseBrowserClient();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load category constraints and enforce active login session
  useEffect(() => {
    if (!router.isReady || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Force authentication before allowing submission
        router.push(`/auth/login?redirect=/community/${slug}/new`);
      } else if (slug) {
        supabase.from("forum_categories").select("*").eq("slug", slug as string).single()
          .then(({ data }) => setCategory(data));
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
      router.push(`/community/${slug}`); // Return to thread list!
    }
  };

  if (!category) {
    return (
      <SiteLayout title="Loading... | UC Connect">
         <section className="card" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <p>Memuat forum...</p>
        </section>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout title={`Buat Diskusi Baru: ${category.name} | UC Connect`}>
      <section className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Buat Diskusi Baru</h1>
        <p style={{ color: "#4b5563", marginBottom: "2rem" }}>di kategori <strong>{category.name}</strong></p>

        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="stack">
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Judul Diskusi</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Dimana tempat fotocopy murah?"
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", marginTop: "1rem" }}>Isi Diskusi</label>
            <textarea
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Jelaskan lebih detail disini..."
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #d1d5db", resize: "vertical" }}
            />
          </div>
          
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <button
              type="submit"
              disabled={loading || !title || !content}
              style={{
                padding: "0.75rem 2rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", 
                fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Menyimpan..." : "Posting Diskusi"}
            </button>
            <Link href={`/community/${slug}`} style={{ padding: "0.75rem 2rem", color: "#4b5563", textDecoration: "none", fontWeight: "bold" }}>
              Batal
            </Link>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}