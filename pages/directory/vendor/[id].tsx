import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import SiteLayout from "@/components/SiteLayout";
import LoadingScreen from "@/components/LoadingScreen";
import ReportButton from "@/components/ReportButton";
import { useToast } from "@/components/ToastProvider";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Stat from "@/components/ui/Stat";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeader from "@/components/ui/SectionHeader";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { serializeJsonLd } from "@/lib/json-ld";
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

/** Inline WhatsApp brand glyph — kept literal for instant recognition on the CTA. */
function WhatsAppGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
        <EmptyState
          icon="search"
          title={t("pages.vendorDetail.notFound")}
          description={error ?? t("pages.vendorDetail.notFoundText")}
        />
      </SiteLayout>
    );
  }

  const ratingValue = vendor.metrics && vendor.metrics.review_count > 0
    ? Number(vendor.metrics.sample_rating)
    : 0;

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
      ? { "@type": "AggregateRating", ratingValue: ratingValue.toFixed(1), reviewCount: vendor.metrics.review_count }
      : undefined,
  };

  return (
    <SiteLayout title={`${vendor.name} | UC Connect`}>
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
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
            <div className="row-wrap" style={{ gap: "0.4rem", marginBottom: "0.55rem" }}>
              {vendor.is_verified && (
                <Badge tone="success" icon="check">{t("pages.explore.verifiedBadge")}</Badge>
              )}
              <Badge tone="gold">{vendor.category ?? "Uncategorized"}</Badge>
              {vendor.city && <Badge tone="pacific" icon="map-pin">{vendor.city}</Badge>}
            </div>
            <h1 id="vendor-name-title" className="display" style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", margin: "0 0 0.35rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              {vendor.logo_url && (
                <img src={vendor.logo_url} alt={`${vendor.name} logo`}
                  style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
              )}
              {vendor.name}
              {token && (
                <button type="button" onClick={toggleFav} className="fav-heart" aria-pressed={isFav}
                  aria-label={isFav ? "Hapus dari favorit" : "Tambah ke favorit"}
                  style={{ position: "static", marginLeft: "0.1rem" }}>
                  <Icon name="heart" size={20} filled={isFav} strokeWidth={2.2} style={{ color: isFav ? "var(--orange)" : "var(--muted)" }} />
                </button>
              )}
            </h1>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              {vendor.tagline ?? `${vendor.city ?? ""} · UC Connect Directory`}
            </p>
            {vendor.address && (
              <p style={{ color: "var(--muted)", margin: "0.3rem 0 0", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <Icon name="map-pin" size={14} /> {vendor.address}
              </p>
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
                style={{ background: "#25D366", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
              >
                <WhatsAppGlyph />
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
          <span className="kicker"><Icon name="store" size={14} strokeWidth={2.6} /> Tentang</span>
          <h2 style={{ marginTop: "0.4rem" }}>{t("pages.vendorDetail.about")}</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            {vendor.description ?? t("pages.vendorDetail.notFoundText")}
          </p>

          {(vendor.university || vendor.sales_system || vendor.delivery_methods) && (
            <div className="vendor-meta-grid" style={{ marginTop: "1.25rem", display: "grid", gap: "0.55rem" }}>
              {vendor.university && (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--muted)", minWidth: "9.5rem", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <Icon name="graduation-cap" size={16} /> Universitas
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{vendor.university}</span>
                </div>
              )}
              {vendor.sales_system && (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--muted)", minWidth: "9.5rem", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <Icon name="receipt" size={16} /> Sistem Penjualan
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{salesSystemLabel(vendor.sales_system)}</span>
                </div>
              )}
              {vendor.delivery_methods && (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--muted)", minWidth: "9.5rem", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <Icon name="truck" size={16} /> Pengiriman
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{vendor.delivery_methods}</span>
                </div>
              )}
            </div>
          )}

          {/* Rating snapshot */}
          {ratingValue > 0 ? (
            <div className="stat-grid" style={{ marginTop: "1.25rem", gridTemplateColumns: "minmax(140px, 1fr)" }}>
              <Stat
                value={ratingValue.toFixed(1)}
                label="Rating rata-rata"
                icon="star"
                tone="warm"
                hint={`${vendor.metrics!.review_count} ulasan`}
              />
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", textAlign: "left", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icon name="star" size={16} style={{ color: "var(--muted)" }} />
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Belum ada rating</span>
            </div>
          )}

          {vendor.items.length > 0 ? (
            <>
              <h3 className="section-title" style={{ marginTop: "1.75rem" }}>{t("pages.vendorDetail.menu")}</h3>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {vendor.items.map((item) => (
                  <div key={item.id} className="product-row" style={{ gap: "0.75rem" }}>
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name}
                        style={{ width: "56px", height: "56px", borderRadius: "12px", objectFit: "cover", flexShrink: 0 }} />
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
            <EmptyState
              icon="package"
              title="Belum ada menu"
              description="Vendor ini belum menambahkan menu/produk."
            />
          )}
        </article>

        {/* ── Right: hours + contact ── */}
        <aside className="detail-card">
          <span className="kicker"><Icon name="clock" size={14} strokeWidth={2.6} /> Jam Buka</span>
          <h2 style={{ marginTop: "0.4rem" }}>{t("pages.vendorDetail.availability")}</h2>

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
                className="btn btn--block"
                href={`https://wa.me/${vendor.whatsapp.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsApp(vendor.id)}
                style={{ background: "#25D366", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.45rem" }}
              >
                <WhatsAppGlyph /> {t("pages.vendorDetail.chatNow")}
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
        <SectionHeader kicker="Ulasan" kickerIcon="star" title="Ulasan & Rating" />

        {/* Rating summary */}
        {ratingValue > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "1.25rem", padding: "1rem 1.1rem", background: "var(--pacific-soft)", borderRadius: "var(--radius-md)" }}>
            <span className="numeral" style={{ fontSize: "2.4rem", lineHeight: 1, color: "var(--pacific-dark)" }}>
              {ratingValue.toFixed(1)}
            </span>
            <div>
              <div style={{ display: "flex", gap: "0.1rem" }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Icon key={s} name="star" size={16} filled={s <= Math.round(ratingValue)}
                    style={{ color: s <= Math.round(ratingValue) ? "#f59e0b" : "#d1d5db" }} />
                ))}
              </div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                {vendor.metrics!.review_count} ulasan
              </p>
            </div>
          </div>
        )}

        {/* Review form */}
        {token && !hasReviewed && !reviews.some(r => r.user_id === currentUserId) ? (
          <div style={{ padding: "1.1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>Tulis Ulasan</h3>
            <div role="radiogroup" aria-label="Rating" style={{ display: "flex", gap: "0.2rem", marginBottom: "0.6rem" }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" role="radio" aria-checked={star === reviewRating}
                  aria-label={`${star} bintang`}
                  onClick={() => setReviewRating(star)}
                  onMouseEnter={() => setReviewHover(star)}
                  onMouseLeave={() => setReviewHover(0)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0 }}>
                  <Icon name="star" size={26} filled={star <= (reviewHover || reviewRating)}
                    style={{ color: star <= (reviewHover || reviewRating) ? "#f59e0b" : "#d1d5db", transition: "color 0.15s" }} />
                </button>
              ))}
            </div>
            <textarea value={reviewContent} onChange={e => setReviewContent(e.target.value)}
              rows={3} placeholder="Ceritakan pengalamanmu... (opsional)"
              style={{ width: "100%", marginBottom: "0.6rem" }} />

            {/* Optional photo */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
              <label className="btn ghost btn--sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <Icon name="camera" size={15} /> Tambah Foto
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
                    className="btn btn--sm btn--danger" aria-label="Hapus foto"
                    style={{ display: "inline-flex", padding: "0.3rem 0.5rem" }}>
                    <Icon name="x" size={14} />
                  </button>
                </>
              )}
            </div>

            <button className="btn" disabled={reviewSubmitting || reviewRating === 0}
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
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "1rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Icon name="check-circle" size={16} style={{ color: "var(--success)" }} /> Kamu sudah memberikan ulasan untuk vendor ini.
          </p>
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
                    <span style={{ marginLeft: "0.5rem", display: "inline-flex", gap: "0.05rem", verticalAlign: "middle" }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Icon key={s} name="star" size={13} filled={s <= r.rating}
                          style={{ color: s <= r.rating ? "#f59e0b" : "#d1d5db" }} />
                      ))}
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
          <EmptyState
            icon="star"
            title="Belum ada ulasan"
            description="Jadilah yang pertama memberikan ulasan untuk vendor ini!"
          />
        )}
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
