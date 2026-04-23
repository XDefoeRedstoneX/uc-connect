import { GetServerSideProps } from "next";
import { FormEvent, useState } from "react";
import HeroSection from "@/components/HeroSection";
import VendorCard from "@/components/VendorCard";
import SiteLayout from "@/components/SiteLayout";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Vendor } from "@/types/domain";

type Props = {
  initialVendors: Vendor[];
  initialError: string | null;
};

export default function ExplorePage({ initialVendors, initialError }: Props) {
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
        title="Eksplorasi Vendor Kampus / Explore Campus Vendors"
        titleId="explore-title"
        description="Cari vendor berdasarkan nama, kategori, atau deskripsi untuk menemukan mitra terbaik."
        chips={["Semua / All", "Makanan / Food", "Jasa Kreatif / Creative", "Kebutuhan Harian / Essentials"]}
        chipsAriaLabel="Quick filters"
      >
        <form onSubmit={onSearch} className="row" aria-label="Search vendors">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama bisnis, kategori, atau deskripsi..."
          />
          <button type="submit">Cari / Search</button>
        </form>
      </HeroSection>

      <section className="card compact-top" aria-label="Vendor results">
        {loading && <p>Memuat vendor... / Loading vendors...</p>}
        {error && <p className="err">{error}</p>}

        {!loading && !error && vendors.length === 0 && (
          <p>Belum ada vendor yang cocok. Coba kata kunci lain atau periksa kembali nanti.</p>
        )}

        <ul className="vendor-grid">
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              title={vendor.name}
              meta={`${vendor.category ?? "Uncategorized"} · ${vendor.city ?? "Unknown city"}`}
              href={`/directory/vendor/${vendor.id}`}
              imageSrc="/images/vendor-placeholder.svg"
              imageAlt={`Placeholder image for ${vendor.name}`}
              description={vendor.description ?? "No description yet."}
              badges={[
                ...(vendor.is_verified ? [{ tone: "success" as const, text: "Verified Vendor" }] : []),
                { tone: "gold" as const, text: "Campus Business" },
              ]}
              ctaLabel="Lihat Detail / View Detail"
            />
          ))}
        </ul>
      </section>
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
