import HeroSection from "@/components/HeroSection";
import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";

const featuredCards = [
  {
    title: "Bite & Bliss Bakery",
    meta: "Food & Beverage · Surabaya",
    href: "/directory/explore",
  },
  {
    title: "Maju Print Corner",
    meta: "Daily Essentials · Malang",
    href: "/directory/explore",
  },
  {
    title: "Pixel Event Creative",
    meta: "Creative Services · Bandung",
    href: "/directory/explore",
  },
];

export default function DirectoryHomePage() {
  return (
    <SiteLayout title="Directory Home | UC Connect">
      <HeroSection
        title="Eksplorasi Bisnis Mahasiswa / Explore Student Businesses"
        titleId="directory-home-title"
        description="Platform komunitas kampus untuk menemukan vendor terpercaya, memesan layanan, dan membangun jejaring UMKM mahasiswa."
        chips={["Food & Beverage", "Creative Services", "Event Needs", "Daily Essentials"]}
        chipsAriaLabel="Business categories"
        actions={[
          { href: "/directory/explore", label: "Mulai Eksplorasi / Start Exploring" },
          { href: "/customer/profile", label: "Buka Profil / Open Profile", variant: "secondary" },
        ]}
      />

      <section className="card compact-top" aria-labelledby="featured-vendor-title">
        <h2 id="featured-vendor-title" className="section-title">Vendor Pilihan Minggu Ini / Featured Vendors</h2>
        <ul className="vendor-grid">
          {featuredCards.map((item) => (
            <VendorCard
              key={item.title}
              title={item.title}
              meta={item.meta}
              href={item.href}
              imageSrc="/images/vendor-placeholder.svg"
              imageAlt={`Placeholder image for ${item.title}`}
              badges={[{ tone: "success", text: "Terverifikasi / Verified" }]}
              ctaLabel="Lihat Vendor / View Vendor"
            />
          ))}
        </ul>
      </section>

      <section className="card compact-top" aria-label="Trust message">
        <span className="badge gold">Aman & Terpercaya / Secure & Trusted</span>
        <p className="compact-top">
          Semua akun vendor akan melalui proses validasi profil sebelum mendapatkan badge verifikasi di halaman eksplorasi.
        </p>
      </section>
    </SiteLayout>
  );
}
