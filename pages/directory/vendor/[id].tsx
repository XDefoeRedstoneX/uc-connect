import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import SiteLayout from "@/components/SiteLayout";
import LoadingScreen from "@/components/LoadingScreen";
import ReportButton from "@/components/ReportButton";
import { useToast } from "@/components/ToastProvider";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { VendorDetail, VendorReview } from "@/types/domain";

const weekdayLabels = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  id: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
} as const;

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency || "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimeRange(opensAt: string | null, closesAt: string | null) {
  if (!opensAt || !closesAt) return "-";
  return `${opensAt.slice(0, 5)} – ${closesAt.slice(0, 5)}`;
}

const SALES_SYSTEM_LABELS: Record<string, string> = {
  "ready-stock": "Ready Stock",
  "pre-order": "Pre-Order",
  lainnya: "Lainnya",
};
const salesSystemLabel = (v: string) => SALES_SYSTEM_LABELS[v] ?? v;

export default function VendorDetailPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { id } = router.query;
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { showToast } = useToast();

  // Reviews state
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);

  function trackWhatsApp(vendorId: string) {
    void fetch("/api/vendor/whatsapp-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_id: vendorId }),
    });
  }

  async function toggleFav() {
    if (!token || !vendor) return;
    const wasFav = isFav;
    setIsFav(!wasFav);
    await fetch("/api/favorites", {
      method: wasFav ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vendor_id: vendor.id }),
    });
  }

  useEffect(() => {
    if (typeof id !== "string") return;

    const load = async () => {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/vendors/${id}`);
      const data = await response.json();
      if (!response.ok) {
        setError(toPublicPageErrorMessage(data.error));
        setLoading(false);
        return;
      }
      setVendor(data.vendor ?? null);
      setLoading(false);

      // Load favorites status
      const sb = getSupabaseBrowserClient();
      if (sb) {
        const { data: sd } = await sb.auth.getSession();
        const tok = sd.session?.access_token;
        const uid = sd.session?.user?.id ?? null;
        setCurrentUserId(uid);
        if (tok) {
          setToken(tok);
          const fr = await fetch("/api/favorites", { headers: { Authorization: `Bearer ${tok}` } });
          if (fr.ok) {
            const fj = await fr.json();
            setIsFav((fj.vendorIds ?? []).includes(typeof id === "string" ? id : ""));
          }
        }
      }

      // Load reviews
      const rr = await fetch(`/api/vendor/${id}/reviews`);
      if (rr.ok) {
        const rj = await rr.json();
        setReviews(rj.reviews ?? []);
      }
    };

    void load();
  }, [id]);

  if (loading) {
    return (
      <SiteLayout title="Memuat... | UC Connect">
        <LoadingScreen />
      </SiteLayout>
    );
  }

  if (error || !vendor) {
    return (
      <SiteLayout title="Vendor Tidak Ditemukan | UC Connect">
        <section className="card" style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🔍</p>
          <h1>{t("pages.vendorDetail.notFound")}</h1>
          {error && <p className="err">{error}</p>}
          <p style={{ color: "var(--muted)" }}>{t("pages.vendorDetail.notFoundText")}</p>
        </section>
      </SiteLayout>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.name,
    description: vendor.description ?? undefined,
    image: vendor.hero_image_url ?? vendor.logo_url ?? undefined,
    telephone: vendor.whatsapp ?? undefined,
    address: vendor.address || vendor.city
      ? { "@type": "PostalAddress", addressLocality: vendor.city ?? undefined, streetAddress: vendor.address ?? undefined, addressCountry: "ID" }
      : undefined,
    aggregateRating: vendor.metrics && vendor.metrics.review_count > 0
      ? { "@type": "AggregateRating", ratingValue: Number(vendor.metrics.sample_rating).toFixed(1), reviewCount: vendor.metrics.review_count }
      : undefined,
  };

  return (
    <SiteLayout title={`${vendor.name} | UC Connect`}>
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      {/* ── Hero banner ── */}
      <section className="detail-hero" aria-labelledby="vendor-name-title">
        <img
          className="detail-banner"
          src={vendor.hero_image_url ?? "/images/banner-placeholder.svg"}
          alt={`Banner for ${vendor.name}`}
        />
        <div className="detail-header">
          <div>
            <div className="row-wrap" style={{ gap: "0.5rem", marginBottom: "0.5rem" }}>
              {vendor.is_verified && (
                <span className="badge success">✓ {t("pages.explore.verifiedBadge")}</span>
              )}
              <span className="badge gold">{vendor.category ?? "Uncategorized"}</span>
              {vendor.city && <span className="badge pacific">📍 {vendor.city}</span>}
            </div>
            <h1 id="vendor-name-title" style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 900, margin: "0 0 0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {vendor.logo_url && (
                <img src={vendor.logo_url} alt={`${vendor.name} logo`}
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              )}
              {vendor.name}
              {token && (
                <button type="button" onClick={toggleFav} aria-label={isFav ? "Hapus dari favorit" : "Tambah ke favorit"}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1, padding: 0, transition: "transform 0.2s ease" }}>
                  {isFav ? "❤️" : "🤍"}
                </button>
              )}
            </h1>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              {vendor.tagline ?? `${vendor.city ?? ""} • UC Connect Directory`}
            </p>
            {vendor.address && (
              <p style={{ color: "var(--muted)", margin: "0.25rem 0 0", fontSize: "0.85rem" }}>📍 {vendor.address}</p>
            )}
          </div>

          <div className="row-wrap" style={{ gap: "0.5rem" }}>
            {vendor.whatsapp ? (
              <a
                className="btn"
                href={`https://wa.me/${vendor.whatsapp.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsApp(vendor.id)}
                style={{ background: "#25D366", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {t("pages.vendorDetail.contactWhatsApp")}
              </a>
            ) : (
              <button type="button" disabled>{t("pages.vendorDetail.unavailableWhatsApp")}</button>
            )}
            {currentUserId && (
              <ReportButton targetType="vendor" targetId={vendor.id} size="md" />
            )}
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="detail-layout" aria-label="Vendor information layout">
        {/* ── Left: about + menu ── */}
        <article className="detail-card">
          <h2>{t("pages.vendorDetail.about")}</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            {vendor.description ?? t("pages.vendorDetail.notFoundText")}
          </p>

          {(vendor.university || vendor.sales_system || vendor.delivery_methods) && (
            <div className="vendor-meta-grid" style={{ marginTop: "1.25rem", display: "grid", gap: "0.5rem" }}>
              {vendor.university && (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "baseline", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--muted)", minWidth: "9rem", flexShrink: 0 }}>🎓 Universitas</span>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{vendor.university}</span>
                </div>
              )}
              {vendor.sales_system && (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "baseline", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--muted)", minWidth: "9rem", flexShrink: 0 }}>🧾 Sistem Penjualan</span>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{salesSystemLabel(vendor.sales_system)}</span>
                </div>
              )}
              {vendor.delivery_methods && (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "baseline", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--muted)", minWidth: "9rem", flexShrink: 0 }}>🚚 Pengiriman</span>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{vendor.delivery_methods}</span>
                </div>
              )}
            </div>
          )}

          {/* Rating placeholder — only show if metrics exist */}
          {vendor.metrics && vendor.metrics.review_count > 0 ? (
            <div className="stat-grid" style={{ marginTop: "1.25rem" }}>
              <div className="stat-tile">
                <p className="stat-value" style={{ background: "var(--gradient-main)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {vendor.metrics.sample_rating.toFixed(1)}
                </p>
                <p className="stat-label">⭐ Rating</p>
                <p className="muted" style={{ fontSize: "0.78rem" }}>{vendor.metrics.review_count} ulasan</p>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: "1.25rem", padding: "0.75rem 1rem", background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)" }}>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>⭐ Belum ada rating</p>
            </div>
          )}

          {vendor.items.length > 0 ? (
            <>
              <h3 className="section-title" style={{ marginTop: "1.5rem" }}>{t("pages.vendorDetail.menu")}</h3>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {vendor.items.map((item) => (
                  <div key={item.id} className="product-row" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name}
                        style={{ width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <p className="product-name">{item.name}</p>
                      {item.description && <p className="product-price">{item.description}</p>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 700, color: "var(--orange)", whiteSpace: "nowrap" }}>
                        {formatCurrency(item.price, item.currency)}
                      </p>
                      <span className="product-status active">{item.item_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ marginTop: "1.5rem", textAlign: "center", padding: "2rem 1rem", background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)" }}>
              <p style={{ fontSize: "1.5rem", margin: "0 0 0.35rem" }}>📦</p>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: 0 }}>Vendor ini belum menambahkan menu/produk.</p>
            </div>
          )}
        </article>

        {/* ── Right: hours + contact ── */}
        <aside className="detail-card">
          <h2>{t("pages.vendorDetail.availability")}</h2>

          <div style={{ display: "grid", gap: 0 }}>
            {vendor.hours.length > 0 ? vendor.hours.map((hour) => (
              <div key={hour.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.7rem 0", borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>
                  {weekdayLabels[language][hour.day_of_week]}
                </span>
                <span style={{ color: hour.is_closed ? "var(--error)" : "var(--muted)", fontSize: "0.88rem" }}>
                  {hour.is_closed ? "Tutup" : formatTimeRange(hour.opens_at, hour.closes_at)}
                  {hour.notes ? ` (${hour.notes})` : ""}
                </span>
              </div>
            )) : (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Jam operasional belum diisi.</p>
            )}
          </div>

          <div className="stack compact-top" style={{ marginTop: "1.25rem" }}>
            {vendor.whatsapp ? (
              <a
                className="btn"
                href={`https://wa.me/${vendor.whatsapp.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                style={{ background: "#25D366", textAlign: "center" }}
              >
                💬 {t("pages.vendorDetail.chatNow")}
              </a>
            ) : (
              <button type="button" disabled style={{ width: "100%" }}>
                {t("pages.vendorDetail.unavailableWhatsApp")}
              </button>
            )}
          </div>
        </aside>
      </section>

      {/* ── Reviews Section ── */}
      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>⭐ Ulasan & Rating</h2>

        {/* Rating summary */}
        {vendor.metrics && vendor.metrics.review_count > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", padding: "1rem", background: "var(--pacific-soft)", borderRadius: "var(--radius-md)" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--pacific-dark)" }}>
              {Number(vendor.metrics.sample_rating).toFixed(1)}
            </span>
            <div>
              <div style={{ fontSize: "1.1rem" }}>
                {"★".repeat(Math.round(Number(vendor.metrics.sample_rating)))}{"☆".repeat(5 - Math.round(Number(vendor.metrics.sample_rating)))}
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                {vendor.metrics.review_count} ulasan
              </p>
            </div>
          </div>
        )}

        {/* Review form */}
        {token && !hasReviewed && !reviews.some(r => r.user_id === currentUserId) ? (
          <div style={{ padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Tulis Ulasan</h3>
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.5rem", fontSize: "1.5rem", cursor: "pointer" }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star}
                  onClick={() => setReviewRating(star)}
                  onMouseEnter={() => setReviewHover(star)}
                  onMouseLeave={() => setReviewHover(0)}
                  style={{ color: star <= (reviewHover || reviewRating) ? "#f59e0b" : "#d1d5db", transition: "color 0.15s" }}>
                  ★
                </span>
              ))}
            </div>
            <textarea value={reviewContent} onChange={e => setReviewContent(e.target.value)}
              rows={3} placeholder="Ceritakan pengalamanmu... (opsional)"
              style={{ width: "100%", marginBottom: "0.5rem" }} />

            {/* Optional photo */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <label className="btn ghost" style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                📷 Tambah Foto
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const { compressAndResize } = await import("@/lib/compress-image");
                    const compressed = await compressAndResize(file, 1000, 1000, 300);
                    setReviewImage(compressed);
                    setReviewImagePreview(URL.createObjectURL(compressed));
                  }} />
              </label>
              {reviewImagePreview && (
                <>
                  <img src={reviewImagePreview} alt="Preview" style={{ height: 40, borderRadius: 6, objectFit: "cover" }} />
                  <button type="button" onClick={() => { setReviewImage(null); setReviewImagePreview(null); }}
                    style={{ background: "var(--error)", fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>✕</button>
                </>
              )}
            </div>

            <button disabled={reviewSubmitting || reviewRating === 0}
              onClick={async () => {
                setReviewSubmitting(true);
                try {
                  let imageUrl: string | null = null;
                  if (reviewImage && currentUserId) {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
                    const path = `${currentUserId}/reviews/${Date.now()}.jpg`;
                    const up = await fetch(`${supabaseUrl}/storage/v1/object/vendor-assets/${path}`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}`, "Content-Type": reviewImage.type, "x-upsert": "true" },
                      body: reviewImage,
                    });
                    if (up.ok) imageUrl = `${supabaseUrl}/storage/v1/object/public/vendor-assets/${path}`;
                  }
                  const res = await fetch(`/api/vendor/${vendor.id}/reviews`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ rating: reviewRating, content: reviewContent.trim() || null, image_url: imageUrl }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    showToast(json.error ?? "Gagal mengirim ulasan.", "error");
                  } else {
                    showToast("Ulasan berhasil dikirim!");
                    setHasReviewed(true);
                    setReviewImage(null); setReviewImagePreview(null);
                    const rr = await fetch(`/api/vendor/${vendor.id}/reviews`);
                    if (rr.ok) { const rj = await rr.json(); setReviews(rj.reviews ?? []); }
                  }
                } finally {
                  setReviewSubmitting(false);
                }
              }}>
              {reviewSubmitting ? "Mengirim..." : "Kirim Ulasan"}
            </button>
          </div>
        ) : token && (hasReviewed || reviews.some(r => r.user_id === currentUserId)) ? (
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "1rem" }}>✅ Kamu sudah memberikan ulasan untuk vendor ini.</p>
        ) : !token ? (
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "1rem" }}>
            <a href={`/auth/login?next=${encodeURIComponent(`/directory/vendor/${vendor.id}`)}`} style={{ color: "var(--pacific)" }}>Login</a> untuk memberikan ulasan.
          </p>
        ) : null}

        {/* Reviews list */}
        {reviews.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {reviews.map(r => (
              <div key={r.id} style={{ padding: "1rem", borderRadius: "var(--radius-md)", background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--gradient-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", color: "var(--muted)", overflow: "hidden", flexShrink: 0 }}>
                    {r.profiles?.avatar_url
                      ? <img src={r.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (r.profiles?.full_name?.[0] ?? "?")}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{r.profiles?.full_name ?? "Pengguna"}</span>
                    <span style={{ color: "#f59e0b", marginLeft: "0.5rem", fontSize: "0.82rem" }}>
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                </div>
                {r.content && <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text)" }}>{r.content}</p>}
                {r.image_url && (
                  <img src={r.image_url} alt="Foto ulasan"
                    style={{ marginTop: "0.5rem", maxHeight: 200, borderRadius: 8, objectFit: "cover", maxWidth: "100%" }} />
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.35rem" }}>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>{new Date(r.created_at).toLocaleDateString("id-ID")}</p>
                  {currentUserId && currentUserId !== r.user_id && (
                    <ReportButton targetType="review" targetId={r.id} />
                  )}
                </div>
                {r.vendor_reply && (
                  <div style={{ marginTop: "0.6rem", borderLeft: "3px solid var(--pacific)", padding: "0.5rem 0.75rem", background: "var(--gradient-subtle)", borderRadius: "0 8px 8px 0" }}>
                    <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "var(--pacific)", letterSpacing: "0.04em" }}>
                      BALASAN VENDOR{r.vendor_reply_at ? ` · ${new Date(r.vendor_reply_at).toLocaleDateString("id-ID")}` : ""}
                    </p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.86rem", lineHeight: 1.55, color: "var(--text)" }}>{r.vendor_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)" }}>
            <p style={{ fontSize: "1.5rem", margin: "0 0 0.35rem" }}>⭐</p>
            <p style={{ color: "var(--muted)", margin: 0 }}>Belum ada ulasan. Jadilah yang pertama!</p>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
