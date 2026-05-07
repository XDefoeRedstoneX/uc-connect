import { GetServerSideProps } from "next";
import { FormEvent, useState } from "react";
import BottomCTA from "@/components/BottomCTA";
import VendorCard from "@/components/VendorCard";
import SiteLayout from "@/components/SiteLayout";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Vendor } from "@/types/domain";

const CATEGORIES = [
  { label: "Semua", value: "" },
  { label: "🍜 Makanan", value: "food" },
  { label: "🎨 Kreatif", value: "creative" },
  { label: "📦 Jasa", value: "essentials" },
  { label: "👗 Fashion", value: "fashion" },
];

type Props = {
  initialVendors: Vendor[];
  initialError: string | null;
};

export default function ExplorePage({ initialVendors, initialError }: Props) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function loadData(search: string, category: string) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (category) params.set("category", category);

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
    void loadData(q, activeCategory);
  }

  function selectCategory(value: string) {
    setActiveCategory(value);
    void loadData(q, value);
  }

  return (
    <SiteLayout title="Jelajahi Vendor | UC Connect">
      {/* ── Hero Search ── */}
      <section className="hero bubble-section" aria-labelledby="explore-title">
        <h1 id="explore-title" style={{ position: "relative", zIndex: 1 }}>{t("pages.explore.title")}</h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.25rem", position: "relative", zIndex: 1 }}>
          {t("pages.explore.subtitle")}
        </p>

        <form onSubmit={onSearch} aria-label="Search vendors" style={{
          display: "flex", gap: "0.5rem", maxWidth: "36rem",
          position: "relative", zIndex: 1,
        }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("pages.explore.searchPlaceholder")}
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ whiteSpace: "nowrap" }}>
            {t("pages.explore.searchBtn")}
          </button>
        </form>

        {/* Filter chips */}
        <div role="group" aria-label="Filter kategori" style={{
          display: "flex", gap: "0.5rem", flexWrap: "wrap",
          marginTop: "1rem", position: "relative", zIndex: 1,
        }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => selectCategory(cat.value)}
              className="chip"
              style={{
                cursor: "pointer",
                background: activeCategory === cat.value ? "var(--pacific-soft)" : "#fff",
                borderColor: activeCategory === cat.value ? "var(--pacific)" : undefined,
                color: activeCategory === cat.value ? "var(--pacific-dark)" : undefined,
                fontWeight: activeCategory === cat.value ? 700 : 600,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Results ── */}
      <section className="card compact-top" aria-label="Vendor results">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
            {loading ? "Mencari..." : `${vendors.length} vendor ditemukan`}
          </p>
        </div>

        {error && <p className="err">{error}</p>}

        {!loading && !error && vendors.length === 0 && (
          <div style={{
            textAlign: "center", padding: "3rem 1rem",
            background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)",
          }}>
            <p style={{ fontSize: "2.5rem", margin: "0 0 0.5rem" }}>🔍</p>
            <p style={{ color: "var(--muted)" }}>{t("pages.explore.noResults")}</p>
          </div>
        )}

        <ul className="vendor-grid vendor-grid--explore">
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
    .select("id,name,tagline,category,city,is_verified,description,whatsapp,hero_image_url,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    props: {
      initialVendors: (data ?? []) as Vendor[],
      initialError: error ? "Tidak dapat memuat daftar vendor saat ini." : null,
    },
  };
};
