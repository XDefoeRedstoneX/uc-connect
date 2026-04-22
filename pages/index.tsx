import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";

const links = [
  { href: "/auth/login", label: "Masuk / Login" },
  { href: "/auth/register", label: "Daftar / Register" },
  { href: "/directory/home", label: "Direktori / Directory" },
  { href: "/directory/explore", label: "Eksplorasi Vendor / Explore Vendors" },
  { href: "/customer/profile", label: "Profil Customer / Customer Profile" },
  { href: "/support", label: "Bantuan / Support" },
];

export default function Home() {
  return (
    <SiteLayout title="UC Connect">
      <section className="hero" aria-labelledby="landing-title">
        <span className="badge gold">UC Connect 2026 UI Refresh</span>
        <h1 id="landing-title">Marketplace Komunitas Kampus yang Lebih Modern</h1>
        <p>
          Desain baru mengikuti referensi archive dengan alur yang lebih jelas: login, eksplorasi vendor,
          dan konversi ke WhatsApp dalam pengalaman bilingual.
        </p>
        <div className="row-wrap">
          <img src="/logo.svg" alt="UC Connect logo" style={{ width: "220px", maxWidth: "70vw" }} />
        </div>
      </section>

      <section className="card compact-top" aria-label="Quick access links">
        <h2>Jalur Utama / Main Routes</h2>
        <ul className="vendor-grid">
          {links.map((item) => (
            <li key={item.href} className="vendor-card">
              <div className="vendor-body">
                <h3>{item.label}</h3>
                <p className="vendor-meta">Route: {item.href}</p>
                <div className="vendor-actions">
                  <Link className="btn" href={item.href}>
                    Buka Halaman / Open
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}
