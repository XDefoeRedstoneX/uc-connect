import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { VendorDetail } from "@/types/domain";

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

export default function VendorDetailPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { id } = router.query;
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function trackWhatsApp(vendorId: string) {
    void fetch("/api/vendor/whatsapp-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_id: vendorId }),
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
    };

    void load();
  }, [id]);

  if (loading) {
    return (
      <SiteLayout title="Memuat... | UC Connect">
        <section className="card" style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</p>
          <p style={{ color: "var(--muted)" }}>{t("pages.vendorDetail.loading")}</p>
        </section>
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

  return (
    <SiteLayout title={`${vendor.name} | UC Connect`}>
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
            <h1 id="vendor-name-title" style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 900, margin: "0 0 0.35rem" }}>
              {vendor.name}
            </h1>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              {vendor.tagline ?? `${vendor.city ?? ""} • UC Connect Directory`}
            </p>
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

          {/* Stats */}
          <div className="stat-grid" style={{ marginTop: "1.25rem" }}>
            <div className="stat-tile">
              <p className="stat-value" style={{ background: "var(--gradient-main)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {vendor.metrics ? vendor.metrics.sample_rating.toFixed(1) : "—"}
              </p>
              <p className="stat-label">{t("pages.vendorDetail.sampleRating")}</p>
              {vendor.metrics && <p className="muted" style={{ fontSize: "0.78rem" }}>{vendor.metrics.review_count} ulasan</p>}
            </div>
            <div className="stat-tile">
              <p className="stat-value" style={{ background: "var(--gradient-main)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {vendor.metrics ? `${(vendor.metrics.response_rate * 100).toFixed(0)}%` : "—"}
              </p>
              <p className="stat-label">{t("pages.vendorDetail.responseRate")}</p>
            </div>
            <div className="stat-tile">
              <p className="stat-value" style={{ background: "var(--gradient-main)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {vendor.metrics?.avg_reply_time ?? "—"}
              </p>
              <p className="stat-label">{t("pages.vendorDetail.avgReplyTime")}</p>
            </div>
          </div>

          {/* Menu / Items */}
          {vendor.items.length > 0 && (
            <>
              <h3 className="section-title" style={{ marginTop: "1.5rem" }}>{t("pages.vendorDetail.menu")}</h3>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {vendor.items.map((item) => (
                  <div key={item.id} className="product-row">
                    <div>
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
            {vendor.metrics && (
              <span className="badge success" style={{ display: "inline-block" }}>
                ⚡ {`${(vendor.metrics.response_rate * 100).toFixed(0)}% ${t("pages.vendorDetail.fastResponse")}`}
              </span>
            )}
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
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
