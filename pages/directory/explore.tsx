import { GetServerSideProps } from "next";
import { FormEvent, useEffect, useState } from "react";
import BottomCTA from "@/components/BottomCTA";
import VendorCard from "@/components/VendorCard";
import SiteLayout from "@/components/SiteLayout";
import { SkeletonCard } from "@/components/LoadingSkeleton";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Vendor } from "@/types/domain";

// Canonical category values — must match VendorOnboardingWizard.tsx and TabEditProfile.tsx
const CATEGORIES: { label: string; value: string; icon: IconName }[] = [
  { label: "Semua", value: "", icon: "grid" },
  { label: "Makanan & Minuman", value: "Makanan & Minuman", icon: "utensils" },
  { label: "Kreatif & Desain", value: "Kreatif & Desain", icon: "palette" },
  { label: "Jasa & Layanan", value: "Jasa & Layanan", icon: "wrench" },
  { label: "Fashion", value: "Fashion", icon: "shirt" },
  { label: "Elektronik", value: "Elektronik", icon: "smartphone" },
  { label: "Kesehatan & Kecantikan", value: "Kesehatan & Kecantikan", icon: "sparkle-heart" },
];

type Props = {
  initialVendors: Vendor[];
  initialFeatured: Vendor[];
  initialError: string | null;
};

export default function ExplorePage({ initialVendors, initialFeatured, initialError }: Props) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [featured, setFeatured] = useState<Vendor[]>(initialFeatured);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [token, setToken] = useState<string | null>(null);

  // Sponsored row only makes sense on the unfiltered browse view.
  const showFeatured = activeCategory === "" && q.trim() === "" && featured.length > 0;

  // Load favorites for logged-in user
  useEffect(() => {
    const loadFavs = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) return;
      setToken(tok);
      const res = await fetch("/api/favorites", { headers: { Authorization: `Bearer ${tok}` } });
      if (res.ok) {
        const j = await res.json();
        setFavIds(new Set(j.vendorIds ?? []));
      }
    };
    void loadFavs();
  }, []);

  async function toggleFav(vendorId: string) {
    if (!token) return; // not logged in
    const isFav = favIds.has(vendorId);
    // Optimistic update
    setFavIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
    await fetch("/api/favorites", {
      method: isFav ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vendor_id: vendorId }),
    });
  }

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
    setFeatured(data.featured ?? []);
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
    <SiteLayout
      title="Jelajahi Vendor | UC Connect"
      description="Temukan dan jelajahi vendor bisnis mahasiswa terbaik di UC Connect."
    >
      {/* ── Search hero ── */}
      <Reveal as="section" className="hero" aria-labelledby="explore-title" style={{ paddingBottom: "1.75rem" }}>
        <span className="kicker" style={{ position: "relative", zIndex: 1 }}>
          <Icon name="search" size={14} strokeWidth={2.6} />
          Jelajahi Direktori
        </span>
        <h1 id="explore-title" className="display" style={{ position: "relative", zIndex: 1, fontSize: "var(--fs-h1)", margin: "0.5rem 0 0" }}>
          {t("pages.explore.title")}
        </h1>
        <p style={{ color: "var(--muted)", margin: "0.6rem 0 1.4rem", position: "relative", zIndex: 1, maxWidth: "52ch" }}>
          {t("pages.explore.subtitle")}
        </p>

        <form onSubmit={onSearch} aria-label="Cari vendor" className="explore-search" style={{ position: "relative", zIndex: 1 }}>
          <Icon name="search" size={18} className="search-ico" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("pages.explore.searchPlaceholder")}
            aria-label={t("pages.explore.searchPlaceholder")}
          />
          <Button type="submit" style={{ whiteSpace: "nowrap" }}>
            {t("pages.explore.searchBtn")}
          </Button>
        </form>

        {/* Category pills */}
        <div role="group" aria-label="Filter kategori" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1.25rem", position: "relative", zIndex: 1 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => selectCategory(cat.value)}
              className="cat-pill"
              aria-pressed={activeCategory === cat.value}
            >
              <Icon name={cat.icon} size={15} strokeWidth={2.2} />
              {cat.label}
            </button>
          ))}
        </div>
      </Reveal>

      {/* ── Sponsored row (paid featured) ── */}
      {showFeatured && (
        <Reveal as="section" index={1} aria-label="Vendor sponsor" style={{ marginTop: "2rem" }}>
          <SectionHeader kicker="Bersponsor" kickerIcon="sparkles" title="Vendor Sponsor" />
          <ul className="vendor-grid vendor-grid--explore">
            {featured.map((vendor) => (
              <VendorCard
                key={`sp-${vendor.id}`}
                title={vendor.name}
                meta={vendor.tagline ?? `${vendor.category ?? "Uncategorized"} · ${vendor.city ?? "Unknown city"}`}
                href={`/directory/vendor/${vendor.id}`}
                imageSrc={vendor.hero_image_url ?? "/images/vendor-placeholder.svg"}
                imageAlt={`Gambar untuk ${vendor.name}`}
                description={vendor.description ?? undefined}
                highlight
                badges={vendor.is_verified ? [{ tone: "success", text: t("pages.explore.verifiedBadge") }] : []}
                ctaLabel={t("pages.explore.viewDetail")}
                isFavorited={favIds.has(vendor.id)}
                onToggleFavorite={token ? () => toggleFav(vendor.id) : undefined}
              />
            ))}
          </ul>
        </Reveal>
      )}

      {/* ── Results ── */}
      <section aria-label="Hasil vendor" style={{ marginTop: "2rem" }}>
        <SectionHeader
          kicker="Direktori"
          kickerIcon="store"
          title="Vendor Mahasiswa"
          action={
            <span style={{ color: "var(--muted)", fontSize: "0.9rem", fontWeight: 600 }}>
              {loading ? "Mencari…" : `${vendors.length} vendor`}
            </span>
          }
        />

        {error && <p className="err">{error}</p>}

        {loading ? (
          <ul className="vendor-grid vendor-grid--explore">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i}><SkeletonCard /></li>
            ))}
          </ul>
        ) : !error && vendors.length === 0 ? (
          <EmptyState icon="search" title="Tidak ada vendor yang cocok" description={t("pages.explore.noResults")} />
        ) : (
          <ul className="vendor-grid vendor-grid--explore">
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                title={vendor.name}
                meta={vendor.tagline ?? `${vendor.category ?? "Uncategorized"} · ${vendor.city ?? "Unknown city"}`}
                href={`/directory/vendor/${vendor.id}`}
                imageSrc={vendor.hero_image_url ?? "/images/vendor-placeholder.svg"}
                imageAlt={`Gambar untuk ${vendor.name}`}
                description={vendor.description ?? undefined}
                badges={[
                  ...(vendor.is_verified ? [{ tone: "success" as const, text: t("pages.explore.verifiedBadge") }] : []),
                  { tone: "gold" as const, text: t("pages.explore.campusBadge") },
                ]}
                ctaLabel={t("pages.explore.viewDetail")}
                isFavorited={favIds.has(vendor.id)}
                onToggleFavorite={token ? () => toggleFav(vendor.id) : undefined}
              />
            ))}
          </ul>
        )}
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
        initialFeatured: [],
        initialError: "Layanan vendor sementara tidak tersedia.",
      },
    };
  }

  const { data, error } = await supabase
    .from("vendors")
    .select("id,name,tagline,category,city,is_verified,description,whatsapp,hero_image_url,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Active paid featured winners, ordered by rank.
  const { data: slots } = await supabase
    .from("featured_slots")
    .select("vendor_id,rank,ends_at")
    .gt("ends_at", new Date().toISOString())
    .order("rank", { ascending: true });

  const featuredIds = (slots ?? []).map((s) => s.vendor_id);
  let initialFeatured: Vendor[] = [];
  if (featuredIds.length > 0) {
    const { data: fv } = await supabase
      .from("vendors")
      .select("id,name,tagline,category,city,is_verified,description,whatsapp,hero_image_url,created_at")
      .in("id", featuredIds)
      .eq("is_verified", true);
    const byId = new Map((fv ?? []).map((v) => [v.id, v as Vendor]));
    initialFeatured = featuredIds.map((id) => byId.get(id)).filter(Boolean) as Vendor[];
  }

  return {
    props: {
      initialVendors: (data ?? []) as Vendor[],
      initialFeatured,
      initialError: error ? "Tidak dapat memuat daftar vendor saat ini." : null,
    },
  };
};
