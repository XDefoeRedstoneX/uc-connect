import HeroSection from "@/components/HeroSection";
import SiteLayout from "@/components/SiteLayout";
import VendorCard from "@/components/VendorCard";
import { useLanguage } from "@/lib/language-context";
import { GetServerSideProps } from "next";

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
  const { t } = useLanguage();

  return (
    <SiteLayout title="Directory Home | UC Connect">
      <HeroSection
        title={t("pages.directoryHome.title")}
        titleId="directory-home-title"
        description={t("pages.directoryHome.subtitle")}
        chips={["Food & Beverage", "Creative Services", "Event Needs", "Daily Essentials"]}
        chipsAriaLabel="Business categories"
        actions={[
          { href: "/directory/explore", label: t("pages.directoryHome.startExploring") },
          { href: "/customer/profile", label: t("pages.directoryHome.openProfile"), variant: "secondary" },
        ]}
      />

      <section className="card compact-top" aria-labelledby="featured-vendor-title">
        <h2 id="featured-vendor-title" className="section-title">{t("pages.directoryHome.featuredTitle")}</h2>
        <ul className="vendor-grid">
          {featuredCards.map((item) => (
            <VendorCard
              key={item.title}
              title={item.title}
              meta={item.meta}
              href={item.href}
              imageSrc="/images/vendor-placeholder.svg"
              imageAlt={`Placeholder image for ${item.title}`}
              badges={[{ tone: "success", text: t("pages.directoryHome.verified") }]}
              ctaLabel={t("pages.explore.viewDetail")}
            />
          ))}
        </ul>
      </section>

      <section className="card compact-top" aria-label="Trust message">
        <span className="badge gold">{t("pages.directoryHome.trustBadge")}</span>
        <p className="compact-top">
          {t("pages.directoryHome.trustText")}
        </p>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
