"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import LoadingScreen from "@/components/LoadingScreen";
import { useToast } from "@/components/ToastProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type MyReview = {
  id: string;
  vendor_id: string;
  rating: number;
  content: string | null;
  image_url: string | null;
  vendor_reply: string | null;
  created_at: string;
  vendors: { id: string; name: string; slug: string } | null;
};

export default function MyReviewsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      setToken(tok);
      const res = await fetch("/api/profile/reviews", { headers: { Authorization: `Bearer ${tok}` } });
      if (res.ok) { const j = await res.json(); setReviews(j.reviews ?? []); }
      setLoading(false);
    };
    void init();
  }, [router]);

  async function deleteReview(vendorId: string, reviewId: string) {
    if (!token || !confirm("Hapus ulasan ini?")) return;
    // Reviews are deleted via the public reviews endpoint (RLS: user owns it).
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from("vendor_reviews").delete().eq("id", reviewId);
    if (error) {
      showToast(`Gagal menghapus ulasan: ${error.message}`, "error");
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    showToast("Ulasan dihapus.");
  }

  if (loading) return <SiteLayout title="Ulasan Saya | UC Connect"><LoadingScreen message="Memuat ulasan..." /></SiteLayout>;

  return (
    <SiteLayout title="Ulasan Saya | UC Connect">
      <section className="hero bubble-section">
        <h1 style={{ position: "relative", zIndex: 1 }}>⭐ Ulasan Saya</h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1 }}>Ulasan yang kamu tulis untuk vendor.</p>
      </section>

      <section className="card compact-top">
        {reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)" }}>
            <p style={{ fontSize: "2.5rem", margin: "0 0 0.5rem" }}>⭐</p>
            <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Belum ada ulasan.</p>
            <Link href="/directory/explore" className="btn">Jelajahi Vendor →</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reviews.map((r) => (
              <div key={r.id} className="dash-card" style={{ display: "grid", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                  <Link href={`/directory/vendor/${r.vendor_id}`} style={{ fontWeight: 700, color: "var(--pacific)" }}>
                    {r.vendors?.name ?? "Vendor"}
                  </Link>
                  <span style={{ color: "#f59e0b" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                {r.content && <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5 }}>{r.content}</p>}
                {r.image_url && <img src={r.image_url} alt="Foto ulasan" style={{ maxHeight: 140, borderRadius: 8, objectFit: "cover", maxWidth: "100%" }} />}
                {r.vendor_reply && (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--pacific)", fontStyle: "italic" }}>↳ Vendor: {r.vendor_reply}</p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="muted" style={{ fontSize: "0.75rem" }}>{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                  <button type="button" onClick={() => deleteReview(r.vendor_id, r.id)}
                    style={{ fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "var(--error)" }}>🗑 Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
