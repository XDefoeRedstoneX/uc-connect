import { GetServerSideProps } from "next";
import { FormEvent, useState } from "react";
import BottomCTA from "@/components/BottomCTA";
import HeroSection from "@/components/HeroSection";
import VendorCard from "@/components/VendorCard";
import SiteLayout from "@/components/SiteLayout";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Vendor } from "@/types/domain";

type Props = {
  initialVendors: Vendor[];
  initialError: string | null;
};

export default function ExplorePage({ initialVendors, initialError }: Props) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function loadData(search: string) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());

    const response = await fetch(`/api/vendors?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      setError(toPublicPageErrorMessage(data.error));
      setLoading(false);
      return;
    }

    setVendors(data.vendors ?? []);
    setLoading(false);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void loadData(q);
  }

  return (
    <SiteLayout title="Explore Vendors | UC Connect">
      <HeroSection
        title={t("pages.explore.title")}
        titleId="explore-title"
        description={t("pages.explore.subtitle")}
        chips={[t("pages.explore.filterAll"), t("pages.explore.filterFood"), t("pages.explore.filterCreative"), t("pages.explore.filterEssentials")]}
        chipsAriaLabel="Quick filters"
      >
        <form onSubmit={onSearch} className="row" aria-label="Search vendors">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("pages.explore.searchPlaceholder")}
          />
          <button type="submit">{t("pages.explore.searchBtn")}</button>
        </form>
      </HeroSection>

      <section className="card compact-top" aria-label="Vendor results">
        {loading && <p>{t("pages.explore.loading")}</p>}
        {error && <p className="err">{error}</p>}

        {!loading && !error && vendors.length === 0 && (
          <p>{t("pages.explore.noResults")}</p>
        )}

        <ul className="vendor-grid">
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              title={vendor.name}
              meta={vendor.tagline ?? `${vendor.category ?? "Uncategorized"} · ${vendor.city ?? "Unknown city"}`}
              href={`/directory/vendor/${vendor.id}`}
              imageSrc={vendor.hero_image_url ?? "/images/vendor-placeholder.svg"}
              imageAlt={`Placeholder image for ${vendor.name}`}
              description={vendor.description ?? "No description yet."}
              badges={[
                ...(vendor.is_verified ? [{ tone: "success" as const, text: t("pages.explore.verifiedBadge") }] : []),
                { tone: "gold" as const, text: t("pages.explore.campusBadge") },
              ]}
              ctaLabel={t("pages.explore.viewDetail")}
            />
          ))}
        </ul>
      </section>

      <BottomCTA />
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      props: {
        initialVendors: [],
        initialError: "Layanan vendor sementara tidak tersedia.",
      },
    };
  }

  const { data, error } = await supabase
    .from("vendors")
    .select("id,name,category,city,is_verified,description,whatsapp,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    props: {
      initialVendors: (data ?? []) as Vendor[],
      initialError: error ? "Tidak dapat memuat daftar vendor saat ini." : null,
    },
  };
};
