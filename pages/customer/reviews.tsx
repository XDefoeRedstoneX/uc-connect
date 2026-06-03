"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AccountNav from "@/components/AccountNav";
import SkeletonList from "@/components/SkeletonList";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";
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
  const confirm = useConfirm();
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
    if (!token) return;
    const ok = await confirm({ title: "Hapus ulasan ini?", confirmLabel: "Hapus", destructive: true });
    if (!ok) return;
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

  if (loading) return (
    <SiteLayout title="Ulasan Saya | UC Connect">
      <AccountNav current="reviews" />
      <section className="card compact-top"><SkeletonList rows={3} /></section>
    </SiteLayout>
  );

  return (
    <SiteLayout title="Ulasan Saya | UC Connect">
      <AccountNav current="reviews" />
      <section className="hero">
        <span className="kicker" style={{ position: "relative", zIndex: 1 }}>
          <Icon name="star" size={14} strokeWidth={2.6} /> Ulasan
        </span>
        <h1 className="display" style={{ position: "relative", zIndex: 1, fontSize: "var(--fs-h1)", margin: "0.5rem 0 0" }}>Ulasan Saya</h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1, marginTop: "0.5rem" }}>Ulasan yang kamu tulis untuk vendor.</p>
      </section>

      <section style={{ marginTop: "1.75rem" }}>
        {reviews.length === 0 ? (
          <EmptyState
            icon="star"
            title="Belum ada ulasan"
            description="Bagikan pengalamanmu dengan memberi ulasan pada vendor."
            action={<Button href="/directory/explore" iconRight="arrow-right">Jelajahi Vendor</Button>}
          />
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reviews.map((r) => (
              <div key={r.id} className="dash-card" style={{ display: "grid", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                  <Link href={`/directory/vendor/${r.vendor_id}`} style={{ fontWeight: 700, color: "var(--pacific)" }}>
                    {r.vendors?.name ?? "Vendor"}
                  </Link>
                  <span style={{ display: "inline-flex", gap: "0.05rem", flexShrink: 0 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Icon key={s} name="star" size={14} filled={s <= r.rating}
                        style={{ color: s <= r.rating ? "#f59e0b" : "#d1d5db" }} />
                    ))}
                  </span>
                </div>
                {r.content && <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5 }}>{r.content}</p>}
                {r.image_url && <img src={r.image_url} alt="Foto ulasan" style={{ maxHeight: 140, borderRadius: 8, objectFit: "cover", maxWidth: "100%" }} />}
                {r.vendor_reply && (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--pacific)", fontStyle: "italic" }}>↳ Vendor: {r.vendor_reply}</p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="muted" style={{ fontSize: "0.75rem" }}>{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                  <button type="button" onClick={() => deleteReview(r.vendor_id, r.id)}
                    className="btn btn--sm btn--danger" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <Icon name="trash" size={13} /> Hapus
                  </button>
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
