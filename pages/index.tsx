import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";
import BottomCTA from "@/components/BottomCTA";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Icon, { type IconName } from "@/components/ui/Icon";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/lib/language-context";
import { GetServerSideProps } from "next";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Vendor } from "@/types/domain";

type HomeProps = {
  sponsoredVendors: Vendor[];
  featuredVendors: Vendor[];
  vendorCount: number;
};

const HOW_IT_WORKS: { step: string; icon: IconName; title: string; desc: string }[] = [
  {
    step: "01",
    icon: "search",
    title: "Temukan Vendor",
    desc: "Jelajahi ratusan bisnis mahasiswa terverifikasi dari berbagai universitas di Indonesia.",
  },
  {
    step: "02",
    icon: "phone",
    title: "Hubungi Langsung",
    desc: "Terhubung langsung via WhatsApp — tanpa perantara, tanpa biaya tambahan.",
  },
  {
    step: "03",
    icon: "users",
    title: "Bergabung Komunitas",
    desc: "Ikut diskusi di forum, temukan tips bisnis, dan bangun jaringan sesama mahasiswa.",
  },
];

const HERO_CHIPS = ["Makanan & Minuman", "Desain Kreatif", "Jasa Kampus", "Fashion"];

export default function Home({ sponsoredVendors, featuredVendors, vendorCount }: HomeProps) {
  const { t } = useLanguage();

  const collage = [...sponsoredVendors, ...featuredVendors]
    .filter((v) => v.hero_image_url)
    .slice(0, 3);
  while (collage.length < 3) collage.push(null as unknown as Vendor);

  return (
    <SiteLayout
      title="UC Connect — Direktori Bisnis Mahasiswa Indonesia"
      description="Platform direktori bisnis mahasiswa terbesar di Indonesia. Temukan vendor terverifikasi dari berbagai universitas."
    >
      {/* ── Editorial hero ── */}
      <Reveal as="section" className="home-hero" aria-labelledby="landing-title">
        <div className="home-hero__copy">
          <span className="kicker">
            <Icon name="sparkles" size={14} strokeWidth={2.6} />
            Direktori Bisnis Mahasiswa
          </span>
          <h1 id="landing-title" className="home-hero__title">
            {t("pages.homepage.title")}
          </h1>
          <p className="home-hero__lead">{t("pages.homepage.description")}</p>

          <div className="home-hero__cta">
            <Button href="/directory/explore" variant="gradient" size="lg" iconRight="arrow-right">
              {t("pages.homepage.exploreBtn")}
            </Button>
            <Button href="/community" variant="secondary" size="lg" icon="chat">
              Forum Komunitas
            </Button>
          </div>

          <div className="home-hero__chips">
            {HERO_CHIPS.map((chip) => (
              <span key={chip} className="chip">{chip}</span>
            ))}
          </div>

          {vendorCount > 0 && (
            <p className="home-hero__trust">
              <Icon name="check-circle" size={18} strokeWidth={2.2} style={{ color: "var(--success)" }} />
              <span>
                <strong>{vendorCount}+</strong> vendor mahasiswa terverifikasi siap ditemukan
              </span>
            </p>
          )}
        </div>

        <div className="home-hero__visual" aria-hidden="true">
          <div className="hero-collage">
            {collage.map((v, i) =>
              v ? (
                <div key={v.id} className="hero-collage__tile">
                  <img src={v.hero_image_url ?? ""} alt="" />
                </div>
              ) : (
                <div key={`ph-${i}`} className="hero-collage__tile hero-collage__tile--ph">
                  <Icon name="store" size={28} strokeWidth={1.6} />
                </div>
              )
            )}
          </div>
        </div>
      </Reveal>

      {/* ── How it works ── */}
      <Reveal as="section" index={1} aria-label="Cara kerja UC Connect" style={{ marginTop: "2.25rem" }}>
        <SectionHeader
          kicker="Cara Kerja"
          kickerIcon="grid"
          title="Tiga langkah menuju bisnis kampus favoritmu"
        />
        <div className="how-grid">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="how-step">
              <span className="how-step__num">{item.step}</span>
              <span className="how-step__icon">
                <Icon name={item.icon} size={22} strokeWidth={2} />
              </span>
              <h3 className="how-step__title">{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ── Sponsored (paid featured auction winners) ── */}
      {sponsoredVendors.length > 0 && (
        <Reveal as="section" index={2} aria-label="Vendor sponsor" style={{ marginTop: "2.25rem" }}>
          <SectionHeader
            kicker="Bersponsor"
            kickerIcon="sparkles"
            title="Vendor Sponsor"
            lead="Etalase pilihan yang memenangkan slot sorotan hari ini."
          />
          <ul className="vendor-grid">
            {sponsoredVendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                title={vendor.name}
                meta={`${vendor.category || "General"}${vendor.city ? ` · ${vendor.city}` : ""}`}
                description={vendor.tagline || undefined}
                href={`/directory/vendor/${vendor.slug || vendor.id}`}
                imageSrc={vendor.hero_image_url || undefined}
                imageAlt={`${vendor.name} cover`}
                highlight
                badges={vendor.is_verified ? [{ text: "Terverifikasi", tone: "success" }] : []}
                ctaLabel="Lihat Detail"
              />
            ))}
          </ul>
        </Reveal>
      )}

      {/* ── Featured Vendors ── */}
      <Reveal as="section" index={3} aria-label="Vendor pilihan" style={{ marginTop: "2.25rem" }}>
        <SectionHeader
          kicker="Pilihan"
          kickerIcon="star"
          title="Vendor Pilihan"
          action={
            <Button href="/directory/explore" variant="secondary" size="sm" iconRight="arrow-right">
              Lihat Semua
            </Button>
          }
        />
        {featuredVendors.length > 0 ? (
          <ul className="vendor-grid">
            {featuredVendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                title={vendor.name}
                meta={`${vendor.category || "General"}${vendor.city ? ` · ${vendor.city}` : ""}`}
                description={vendor.tagline || undefined}
                href={`/directory/vendor/${vendor.slug || vendor.id}`}
                imageSrc={vendor.hero_image_url || undefined}
                imageAlt={`${vendor.name} cover`}
                badges={vendor.is_verified ? [{ text: "Terverifikasi", tone: "success" }] : []}
                ctaLabel="Lihat Detail"
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="store"
            title="Belum ada vendor terdaftar"
            description="Jadilah yang pertama menampilkan bisnismu di UC Connect."
            action={
              <Button href="/vendor/onboarding" icon="store">
                Daftar Sebagai Vendor
              </Button>
            }
          />
        )}
      </Reveal>

      {/* ── CTA ── */}
      <BottomCTA />
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { props: { sponsoredVendors: [], featuredVendors: [], vendorCount: 0 } };
  }

  // Paid auction winners with an active 24h window, ordered by rank.
  const { data: slots } = await supabase
    .from("featured_slots")
    .select("vendor_id,rank,ends_at")
    .gt("ends_at", new Date().toISOString())
    .order("rank", { ascending: true });

  const sponsoredIds = (slots ?? []).map((s) => s.vendor_id);
  let sponsoredVendors: Vendor[] = [];
  if (sponsoredIds.length > 0) {
    const { data: sv } = await supabase
      .from("vendors")
      .select("id,slug,name,tagline,category,city,is_verified,hero_image_url")
      .in("id", sponsoredIds)
      .eq("is_verified", true);
    const byId = new Map((sv ?? []).map((v) => [v.id, v as Vendor]));
    sponsoredVendors = sponsoredIds.map((id) => byId.get(id)).filter(Boolean) as Vendor[];
  }

  // Regular "Vendor Pilihan": recent verified vendors, excluding any already
  // shown in the sponsored row.
  const { data, count } = await supabase
    .from("vendors")
    .select("id,slug,name,tagline,category,city,is_verified,hero_image_url", { count: "exact" })
    .eq("is_verified", true)
    .order("created_at", { ascending: false })
    .limit(6);

  const featuredVendors = ((data ?? []) as Vendor[])
    .filter((v) => !sponsoredIds.includes(v.id))
    .slice(0, 3);

  return {
    props: { sponsoredVendors, featuredVendors, vendorCount: count ?? 0 },
  };
};
