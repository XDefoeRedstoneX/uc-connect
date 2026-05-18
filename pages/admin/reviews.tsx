"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AdminNav from "@/components/admin/AdminNav";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AdminReview = {
  id: string;
  vendor_id: string;
  user_id: string;
  rating: number;
  content: string | null;
  vendor_reply: string | null;
  vendor_reply_at: string | null;
  created_at: string;
  vendors: { id: string; name: string; slug: string } | null;
  profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export default function AdminReviewsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (tok: string, f: "all" | "low") => {
    setLoading(true);
    const res = await fetch(`/api/admin/reviews?filter=${f}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 403) { void router.replace("/unauthorized"); return; }
    if (res.ok) {
      const j = await res.json();
      setReviews(j.reviews ?? []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      setToken(tok);
      await load(tok, filter);
    };
    void init();
  }, [router, load, filter]);

  async function remove(reviewId: string) {
    if (!token || !confirm("Hapus ulasan ini? Tindakan ini tidak bisa dibatalkan.")) return;
    const res = await fetch("/api/admin/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ review_id: reviewId }),
    });
    if (res.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Gagal menghapus ulasan");
    }
  }

  return (
    <SiteLayout title="Moderasi Ulasan | Admin">
      <AdminNav current="reviews" />

      <div className="dash-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>⭐ Moderasi Ulasan</h2>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {(["all", "low"] as const).map((f) => (
              <button key={f} type="button" className="chip" onClick={() => setFilter(f)}
                style={{
                  cursor: "pointer", background: filter === f ? "var(--pacific-soft)" : "#fff",
                  borderColor: filter === f ? "var(--pacific)" : undefined,
                  fontWeight: filter === f ? 700 : 600,
                }}>
                {f === "all" ? "Semua" : "Rating ≤ 2"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Memuat...</p>
        ) : reviews.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Tidak ada ulasan.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {reviews.map((r) => (
              <div key={r.id} className="product-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.2rem" }}>
                    <Link href={`/directory/vendor/${r.vendor_id}`} style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--pacific)" }}>
                      {r.vendors?.name ?? "Vendor"}
                    </Link>
                    <span style={{ color: "#f59e0b", letterSpacing: "0.04em" }}>
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.content && (
                    <p style={{ color: "var(--text)", fontSize: "0.88rem", margin: "0 0 0.3rem", lineHeight: 1.5 }}>{r.content}</p>
                  )}
                  {r.vendor_reply && (
                    <p style={{ color: "var(--pacific)", fontSize: "0.82rem", margin: "0 0 0.3rem", fontStyle: "italic" }}>
                      ↳ Vendor: {r.vendor_reply}
                    </p>
                  )}
                  <div className="row-wrap" style={{ gap: "0.4rem", fontSize: "0.78rem" }}>
                    <span style={{ color: "var(--muted)" }}>
                      oleh {r.profiles?.full_name ?? r.profiles?.username ?? "Pengguna"}
                    </span>
                    <span style={{ color: "var(--muted)" }}>{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>
                <button onClick={() => remove(r.id)}
                  style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem", background: "var(--error)", flexShrink: 0 }}>
                  🗑 Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
