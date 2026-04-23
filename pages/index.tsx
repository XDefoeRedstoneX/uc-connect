import HeroSection from "@/components/HeroSection";
import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";

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
      <HeroSection
        title="Marketplace Komunitas Kampus yang Lebih Modern"
        titleId="landing-title"
        description="Desain baru mengikuti referensi archive dengan alur yang lebih jelas: login, eksplorasi vendor, dan konversi ke WhatsApp dalam pengalaman bilingual."
        badge="UC Connect 2026 UI Refresh"
      >
        <div className="row-wrap">
          <img className="hero-logo" src="/logo.svg" alt="UC Connect logo" />
        </div>
      </HeroSection>

      <section className="card compact-top" aria-label="Quick access links">
        <h2>Jalur Utama / Main Routes</h2>
        <ul className="vendor-grid">
          {links.map((item) => (
            <VendorCard
              key={item.href}
              title={item.label}
              meta={`Route: ${item.href}`}
              href={item.href}
              ctaLabel="Buka Halaman / Open"
            />
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}
