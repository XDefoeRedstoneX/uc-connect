import HeroSection from "@/components/HeroSection";
import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";
import { useLanguage } from "@/lib/language-context";
import { GetServerSideProps } from "next";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Vendor } from "@/types/domain";
import Link from "next/link";

type HomeProps = {
  featuredVendors: Vendor[];
};

function HomeContent({ featuredVendors }: HomeProps) {
  const { t } = useLanguage();

  return (
    <SiteLayout title="UC Connect">
      <HeroSection
        title={t("pages.homepage.title")}
        titleId="landing-title"
        description={t("pages.homepage.description")}
      >
        <div className="row-wrap">
          <img className="hero-logo" src="/logo.svg" alt="UC Connect logo" />
        </div>
      </HeroSection>

      <section className="card compact-top" aria-label="Featured vendors">
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Featured Connect Vendors</h2>
        <ul className="vendor-grid">
          {featuredVendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              title={vendor.name}
              meta={`${vendor.category || "General"} ${
                vendor.city ? `• ${vendor.city}` : ""
              }`}
              description={vendor.tagline || undefined}
              href={`/directory/vendor/${vendor.slug || vendor.id}`}
              imageSrc={vendor.hero_image_url || undefined}
              imageAlt={`${vendor.name} exterior`}
              badges={
                vendor.is_verified ? [{ text: "Verified", tone: "success" }] : []
              }
            />
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
           <Link href="/directory/explore" className="btn btn-primary">
             {t("pages.homepage.exploreBtn")}
           </Link>
        </div>
      </section>
    </SiteLayout>
  );
}

export default function Home({ featuredVendors }: HomeProps) {
  return <HomeContent featuredVendors={featuredVendors} />;
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
