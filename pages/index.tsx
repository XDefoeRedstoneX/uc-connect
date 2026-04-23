import HeroSection from "@/components/HeroSection";
import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";
import { useLanguage } from "@/lib/language-context";
import { GetServerSideProps } from "next";

function HomeContent() {
  const { t } = useLanguage();

  const entryCards = [
    {
      href: "/directory/explore",
      label: t("pages.homepage.exploreVendors"),
      meta: t("pages.homepage.exploreDesc"),
      ctaLabel: t("pages.homepage.exploreBtn"),
    },
    {
      href: "/auth/login",
      label: t("pages.homepage.signIn"),
      meta: t("pages.homepage.signInDesc"),
      ctaLabel: t("pages.homepage.signInBtn"),
    },
    {
      href: "/auth/register",
      label: t("pages.homepage.createAccount"),
      meta: t("pages.homepage.createDesc"),
      ctaLabel: t("pages.homepage.createBtn"),
    },
  ];

  return (
    <SiteLayout title="UC Connect">
      <HeroSection
        title={t("pages.homepage.title")}
        titleId="landing-title"
        description={t("pages.homepage.description")}
        badge="UC Connect"
      >
        <div className="row-wrap">
          <img className="hero-logo" src="/logo.svg" alt="UC Connect logo" />
        </div>
      </HeroSection>

      <section className="card compact-top" aria-label="Main user entry points">
        <h2>{t("pages.homepage.startHere")}</h2>
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

export default function Home() {
  return <HomeContent />;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
