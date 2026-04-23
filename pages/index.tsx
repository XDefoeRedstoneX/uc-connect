import HeroSection from "@/components/HeroSection";
import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";

const entryCards = [
  {
    href: "/directory/explore",
    label: "Eksplorasi Vendor Kampus / Explore Vendors",
    meta: "Temukan UMKM mahasiswa terverifikasi berdasarkan kategori dan lokasi.",
    ctaLabel: "Mulai Eksplorasi / Start Exploring",
  },
  {
    href: "/auth/login",
    label: "Masuk ke Akun Anda / Sign In",
    meta: "Kelola profil, simpan vendor favorit, dan lanjutkan percakapan bisnis.",
    ctaLabel: "Masuk / Sign In",
  },
  {
    href: "/auth/register",
    label: "Gabung UC Connect / Create Account",
    meta: "Daftar sebagai pelanggan atau calon vendor untuk memperluas jaringan kampus.",
    ctaLabel: "Daftar Sekarang / Register",
  },
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

      <section className="card compact-top" aria-label="Main user entry points">
        <h2>Mulai dari Sini / Start Here</h2>
        <ul className="vendor-grid">
          {entryCards.map((item) => (
            <VendorCard
              key={item.href}
              title={item.label}
              meta={item.meta}
              href={item.href}
              ctaLabel={item.ctaLabel}
            />
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}
