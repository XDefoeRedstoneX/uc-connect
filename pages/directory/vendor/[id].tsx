import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { VendorDetail } from "@/types/domain";

const weekdayLabels = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  id: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
} as const;

function formatCurrency(value: number, currency: string) {
  const resolvedCurrency = currency || "IDR";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: resolvedCurrency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimeRange(opensAt: string | null, closesAt: string | null) {
  if (!opensAt || !closesAt) {
    return "-";
  }

  return `${opensAt.slice(0, 5)} - ${closesAt.slice(0, 5)}`;
}

export default function VendorDetailPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { id } = router.query;
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <SiteLayout title="Vendor Detail | UC Connect">
      {loading && (
        <section className="card">
          <h1>{t("pages.vendorDetail.loading")}</h1>
        </section>
      )}

      {!loading && error && (
        <section className="card">
          <h1>{t("pages.vendorDetail.notFound")}</h1>
          <p className="err">{error}</p>
        </section>
      )}

      {!loading && !error && !vendor && (
        <section className="card">
          <h1>{t("pages.vendorDetail.notFound")}</h1>
          <p>{t("pages.vendorDetail.notFoundText")}</p>
        </section>
      )}

      {!loading && !error && vendor && (
        <>
          <section className="detail-hero" aria-labelledby="vendor-name-title">
            <img className="detail-banner" src={vendor.hero_image_url ?? "/images/banner-placeholder.svg"} alt={`Banner for ${vendor.name}`} />
            <div className="detail-header">
              <div>
                <div className="row-wrap">
                  {vendor.is_verified && <span className="badge success">{t("pages.explore.verifiedBadge")}</span>}
                  <span className="badge gold">{vendor.category ?? "Uncategorized"}</span>
                </div>
                <h1 id="vendor-name-title">{vendor.name}</h1>
                <p>{vendor.tagline ?? `${vendor.city ?? "Unknown city"} • UC Connect Directory`}</p>
              </div>

              {vendor.whatsapp ? (
                <a className="btn" href={`https://wa.me/${vendor.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                  {t("pages.vendorDetail.contactWhatsApp")}
                </a>
              ) : (
                <button type="button" disabled>{t("pages.vendorDetail.unavailableWhatsApp")}</button>
              )}
            </div>
          </section>

          <section className="detail-layout" aria-label="Vendor information layout">
            <article className="detail-card">
              <h2>{t("pages.vendorDetail.about")}</h2>
              <p>{vendor.description ?? t("pages.vendorDetail.notFoundText")}</p>

              <div className="stat-grid">
                <div className="stat-tile">
                  <p className="stat-value">{vendor.metrics ? vendor.metrics.sample_rating.toFixed(1) : "-"}</p>
                  <p className="stat-label">{t("pages.vendorDetail.sampleRating")}</p>
                  {vendor.metrics && <p className="muted">{vendor.metrics.review_count} reviews</p>}
                </div>
                <div className="stat-tile">
                  <p className="stat-value">{vendor.metrics ? `${vendor.metrics.response_rate.toFixed(0)}%` : "-"}</p>
                  <p className="stat-label">{t("pages.vendorDetail.responseRate")}</p>
                </div>
                <div className="stat-tile">
                  <p className="stat-value">{vendor.metrics?.avg_reply_time ?? "-"}</p>
                  <p className="stat-label">{t("pages.vendorDetail.avgReplyTime")}</p>
                </div>
              </div>

              <h3 className="section-title">{t("pages.vendorDetail.menu")}</h3>
              {vendor.items.length === 0 && <p className="muted">No menu or service items yet.</p>}
              <ul className="vendor-grid">
                {vendor.items.map((item) => (
                  <VendorCard
                    key={item.id}
                    title={item.name}
                    meta={`${item.item_type.toUpperCase()} · ${formatCurrency(item.price, item.currency)}`}
                    href="#"
                    imageSrc={item.image_url ?? "/images/vendor-placeholder.svg"}
                    imageAlt={`Image for ${item.name}`}
                    description={item.description ?? undefined}
                  />
                ))}
              </ul>
            </article>

            <aside className="detail-card">
              <h2>{t("pages.vendorDetail.availability")}</h2>
              <div className="stack compact-top">
                {vendor.hours.map((hour) => (
                  <p key={hour.id}>
                    {weekdayLabels[language][hour.day_of_week]}: {hour.is_closed ? "Closed" : formatTimeRange(hour.opens_at, hour.closes_at)}
                    {hour.notes ? ` (${hour.notes})` : ""}
                  </p>
                ))}
              </div>
              <div className="stack compact-top">
                <span className="badge success">
                  {vendor.metrics ? `${vendor.metrics.response_rate.toFixed(0)}% ${t("pages.vendorDetail.fastResponse")}` : t("pages.vendorDetail.fastResponse")}
                </span>
                {vendor.whatsapp ? (
                  <a className="btn" href={`https://wa.me/${vendor.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                    {t("pages.vendorDetail.chatNow")}
                  </a>
                ) : (
                  <button type="button" disabled>{t("pages.vendorDetail.unavailableWhatsApp")}</button>
                )}
              </div>
            </aside>
          </section>
        </>
      )}
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
