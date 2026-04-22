import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { Vendor } from "@/types/domain";

export default function VendorDetailPage() {
  const router = useRouter();
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
        setError(data.error ?? "Failed to load vendor");
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
          <h1>Loading vendor details...</h1>
        </section>
      )}

      {!loading && error && (
        <section className="card">
          <h1>Unable to load vendor</h1>
          <p className="err">{error}</p>
        </section>
      )}

      {!loading && !error && !vendor && (
        <section className="card">
          <h1>Vendor not found</h1>
          <p>Vendor yang Anda cari belum tersedia atau sudah dihapus.</p>
        </section>
      )}

      {!loading && !error && vendor && (
        <>
          <section className="detail-hero" aria-labelledby="vendor-name-title">
            <img className="detail-banner" src="/images/banner-placeholder.svg" alt={`Banner placeholder for ${vendor.name}`} />
            <div className="detail-header">
              <div>
                <div className="row-wrap">
                  {vendor.is_verified && <span className="badge success">Vendor Terverifikasi / Verified</span>}
                  <span className="badge gold">{vendor.category ?? "Uncategorized"}</span>
                </div>
                <h1 id="vendor-name-title">{vendor.name}</h1>
                <p>{vendor.city ?? "Unknown city"} • UC Connect Directory</p>
              </div>

              {vendor.whatsapp ? (
                <a className="btn" href={`https://wa.me/${vendor.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                  Hubungi WhatsApp / Contact WhatsApp
                </a>
              ) : (
                <button type="button" disabled>Nomor WhatsApp belum tersedia</button>
              )}
            </div>
          </section>

          <section className="detail-layout" aria-label="Vendor information layout">
            <article className="detail-card">
              <h2>Tentang Vendor / About This Vendor</h2>
              <p>{vendor.description ?? "Vendor ini belum menambahkan deskripsi bisnis."}</p>

              <div className="stat-grid">
                <div className="stat-tile">
                  <p className="stat-value">4.8</p>
                  <p className="stat-label">Sample Rating</p>
                </div>
                <div className="stat-tile">
                  <p className="stat-value">95%</p>
                  <p className="stat-label">Response Rate</p>
                </div>
                <div className="stat-tile">
                  <p className="stat-value">24h</p>
                  <p className="stat-label">Avg Reply Time</p>
                </div>
              </div>

              <h3 className="section-title">Menu dan Layanan / Menu & Services</h3>
              <ul className="vendor-grid">
                <li className="vendor-card">
                  <img className="vendor-cover" src="/images/vendor-placeholder.svg" alt="Product placeholder one" />
                  <div className="vendor-body">
                    <h3>Paket Promo Kampus</h3>
                    <p className="vendor-meta">Mulai dari Rp35.000</p>
                  </div>
                </li>
                <li className="vendor-card">
                  <img className="vendor-cover" src="/images/vendor-placeholder.svg" alt="Product placeholder two" />
                  <div className="vendor-body">
                    <h3>Layanan Event Mini</h3>
                    <p className="vendor-meta">Mulai dari Rp120.000</p>
                  </div>
                </li>
              </ul>
            </article>

            <aside className="detail-card">
              <h2>Ketersediaan / Availability</h2>
              <p>Senin - Jumat: 08.00 - 20.00</p>
              <p>Sabtu - Minggu: 09.00 - 17.00</p>
              <div className="stack compact-top">
                <span className="badge success">Respon Cepat / Fast Response</span>
                {vendor.whatsapp ? (
                  <a className="btn" href={`https://wa.me/${vendor.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                    Chat Sekarang / Chat Now
                  </a>
                ) : (
                  <button type="button" disabled>Contact unavailable</button>
                )}
              </div>
            </aside>
          </section>
        </>
      )}
    </SiteLayout>
  );
}
