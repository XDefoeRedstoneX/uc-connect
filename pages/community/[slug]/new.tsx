import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";
import LoadingScreen from "@/components/LoadingScreen";
import { useToast } from "@/components/ToastProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { compressAndResize } from "@/lib/compress-image";
import { ForumCategory } from "@/types/domain";
import type { Session } from "@supabase/supabase-js";

export default function NewDiscussion() {
  const router = useRouter();
  const { slug } = router.query;
  const supabase = getSupabaseBrowserClient();
  const { showToast } = useToast();
  const imageRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleImage(file: File | null) {
    if (!file) return;
    const compressed = await compressAndResize(file, 1200, 900, 400);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  }

  async function uploadImage(userId: string, file: File): Promise<string | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${userId}/forum/${Date.now()}.${ext}`;
    // Use user's session token so Supabase Storage recognises the request as authenticated
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const token = session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const res = await fetch(`${supabaseUrl}/storage/v1/object/forum-images/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type, "x-upsert": "true" },
      body: file,
    });
    if (!res.ok) return null;
    return `${supabaseUrl}/storage/v1/object/public/forum-images/${path}`;
  }

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

    // Upload image if present
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage(userData.user.id, imageFile);
      if (!imageUrl) {
        setError("Gagal mengupload gambar. Pastikan bucket forum-images sudah dibuat dan public.");
        setLoading(false);
        return;
      }
    }

    const insertPayload: Record<string, unknown> = {
      category_id: category.id,
      author_id: userData.user.id,
      title: title.trim(),
      content: content.trim(),
    };
    if (imageUrl) insertPayload.image_url = imageUrl;

    const { error: insertError } = await supabase.from("forum_threads").insert(insertPayload);

    if (insertError) {
      setError("Gagal membuat diskusi: " + insertError.message);
      setLoading(false);
    } else {
      showToast("Diskusi berhasil dibuat!");
      void router.push(`/community/${slug}`);
    }
  };

  if (!category) {
    return (
      <SiteLayout title="Loading... | UC Connect">
        <LoadingScreen message="Memuat forum..." />
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

          {/* Image upload */}
          <div>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Lampiran Gambar (opsional)</span>
            <div className="dropzone" onClick={() => imageRef.current?.click()}
              style={{ height: "80px", backgroundImage: imagePreview ? `url(${imagePreview})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
              {!imagePreview && <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>📷 Klik untuk upload gambar</span>}
              <input ref={imageRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => handleImage(e.target.files?.[0] ?? null)} />
            </div>
            {imagePreview && (
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                style={{ marginTop: "0.5rem", background: "var(--error)", fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}>
                Hapus Gambar
              </button>
            )}
          </div>

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