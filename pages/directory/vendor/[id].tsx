import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { Vendor } from "@/types/domain";

export default function VendorDetailPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { id } = router.query;
  const [vendor, setVendor] = useState<Vendor | null>(null);
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
            <img className="detail-banner" src="/images/banner-placeholder.svg" alt={`Banner placeholder for ${vendor.name}`} />
            <div className="detail-header">
              <div>
                <div className="row-wrap">
                  {vendor.is_verified && <span className="badge success">{t("pages.explore.verifiedBadge")}</span>}
                  <span className="badge gold">{vendor.category ?? "Uncategorized"}</span>
                </div>
                <h1 id="vendor-name-title">{vendor.name}</h1>
                <p>{vendor.city ?? "Unknown city"} • UC Connect Directory</p>
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
                  <p className="stat-value">4.8</p>
                  <p className="stat-label">{t("pages.vendorDetail.sampleRating")}</p>
                </div>
                <div className="stat-tile">
                  <p className="stat-value">95%</p>
                  <p className="stat-label">{t("pages.vendorDetail.responseRate")}</p>
                </div>
                <div className="stat-tile">
                  <p className="stat-value">24h</p>
                  <p className="stat-label">{t("pages.vendorDetail.avgReplyTime")}</p>
                </div>
              </div>

              <h3 className="section-title">{t("pages.vendorDetail.menu")}</h3>
              <ul className="vendor-grid">
                <VendorCard
                  title="Paket Promo Kampus"
                  meta="Mulai dari Rp35.000"
                  href="#"
                  imageSrc="/images/vendor-placeholder.svg"
                  imageAlt="Product placeholder one"
                />
                <VendorCard
                  title="Layanan Event Mini"
                  meta="Mulai dari Rp120.000"
                  href="#"
                  imageSrc="/images/vendor-placeholder.svg"
                  imageAlt="Product placeholder two"
                />
              </ul>
            </article>

            <aside className="detail-card">
              <h2>{t("pages.vendorDetail.availability")}</h2>
              <p>Senin - Jumat: 08.00 - 20.00</p>
              <p>Sabtu - Minggu: 09.00 - 17.00</p>
              <div className="stack compact-top">
                <span className="badge success">{t("pages.vendorDetail.fastResponse")}</span>
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
