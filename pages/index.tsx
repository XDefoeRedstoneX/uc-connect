import HeroSection from "@/components/HeroSection";
import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";
import BottomCTA from "@/components/BottomCTA";
import { useLanguage } from "@/lib/language-context";
import { GetServerSideProps } from "next";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Vendor } from "@/types/domain";
import Link from "next/link";

type HomeProps = {
  featuredVendors: Vendor[];
};

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "🔍",
    title: "Temukan Vendor",
    desc: "Jelajahi ratusan bisnis mahasiswa terverifikasi dari berbagai universitas di Indonesia.",
  },
  {
    step: "02",
    icon: "💬",
    title: "Hubungi Langsung",
    desc: "Terhubung langsung via WhatsApp — tanpa perantara, tanpa biaya tambahan.",
  },
  {
    step: "03",
    icon: "🌟",
    title: "Bergabung Komunitas",
    desc: "Ikut diskusi di forum, temukan tips bisnis, dan bangun jaringan sesama mahasiswa.",
  },
];


export default function Home({ featuredVendors }: HomeProps) {
  const { t } = useLanguage();

  return (
    <SiteLayout title="UC Connect — Direktori Bisnis Mahasiswa Indonesia" description="Platform direktori bisnis mahasiswa terbesar di Indonesia. Temukan vendor terverifikasi dari berbagai universitas.">
      {/* ── Hero ── */}
      <HeroSection
        title={t("pages.homepage.title")}
        titleId="landing-title"
        description={t("pages.homepage.description")}
        actions={[
          { href: "/directory/explore", label: t("pages.homepage.exploreBtn"), variant: "primary" },
          { href: "/community", label: "Forum Komunitas", variant: "secondary" },
        ]}
      >
        <div className="row-wrap" style={{ gap: "0.5rem", margin: "1rem 0" }}>
          {["Makanan & Minuman", "Desain Kreatif", "Jasa Kampus", "Fashion"].map((chip) => (
            <span key={chip} className="chip">{chip}</span>
          ))}
        </div>
      </HeroSection>

      {/* ── How it works ── */}
      <section className="section-gradient bubble-section" aria-label="How UC Connect works" style={{ marginTop: "1.5rem" }}>
        <h2 className="section-title" style={{ textAlign: "center", marginBottom: "1.5rem" }}>Cara Kerja UC Connect</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} style={{
              background: "var(--panel)",
              borderRadius: "var(--radius-md)",
              padding: "1.5rem",
              border: "1px solid var(--border)",
              position: "relative",
              overflow: "hidden",
            }}>
              <span style={{
                position: "absolute", top: "0.75rem", right: "1rem",
                fontSize: "3rem", fontWeight: 900, opacity: 0.06,
                color: "var(--pacific)", lineHeight: 1,
              }}>{item.step}</span>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{item.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: "0.4rem", color: "var(--text)" }}>{item.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Vendors ── */}
      <section className="card compact-top" aria-label="Featured vendors">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Vendor Pilihan</h2>
          <Link href="/directory/explore" className="btn" style={{ background: "var(--gradient-cool)", fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
            Lihat Semua →
          </Link>
        </div>

        {featuredVendors.length > 0 ? (
          <ul className="vendor-grid">
            {featuredVendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                title={vendor.name}
                meta={`${vendor.category || "General"}${vendor.city ? ` • ${vendor.city}` : ""}`}
                description={vendor.tagline || undefined}
                href={`/directory/vendor/${vendor.slug || vendor.id}`}
                imageSrc={vendor.hero_image_url || undefined}
                imageAlt={`${vendor.name} cover`}
                badges={vendor.is_verified ? [{ text: "Verified", tone: "success" }] : []}
                ctaLabel="Lihat Detail"
              />
            ))}
          </ul>
        ) : (
          <div style={{
            textAlign: "center", padding: "3rem 1rem",
            background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)",
          }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏪</p>
            <p style={{ color: "var(--muted)" }}>Belum ada vendor terdaftar. Jadilah yang pertama!</p>
            <Link href="/vendor/onboarding" className="btn" style={{ marginTop: "1rem", display: "inline-block" }}>
              Daftar Sebagai Vendor
            </Link>
          </div>
        )}
      </section>

      {/* ── CTA ── */}
      <BottomCTA />
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { props: { featuredVendors: [] } };
  }

  const { data } = await supabase
    .from("vendors")
    .select("id,slug,name,tagline,category,city,is_verified,hero_image_url")
    .eq("is_verified", true)
    .limit(3);

  return {
    props: {
      featuredVendors: (data ?? []) as Vendor[],
    },
  };
};
