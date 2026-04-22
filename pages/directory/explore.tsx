import { GetServerSideProps } from "next";
import Link from "next/link";
import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
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
      setError(data.error ?? "Failed to fetch vendors");
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
      <section className="hero" aria-labelledby="explore-title">
        <h1 id="explore-title">Eksplorasi Vendor Kampus / Explore Campus Vendors</h1>
        <p>Cari vendor berdasarkan nama, kategori, atau deskripsi untuk menemukan mitra terbaik.</p>
        <form onSubmit={onSearch} className="row" aria-label="Search vendors">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama bisnis, kategori, atau deskripsi..."
          />
          <button type="submit">Cari / Search</button>
        </form>
        <div className="row-wrap" aria-label="Quick filters">
          <span className="chip">Semua / All</span>
          <span className="chip">Makanan / Food</span>
          <span className="chip">Jasa Kreatif / Creative</span>
          <span className="chip">Kebutuhan Harian / Essentials</span>
        </div>
      </section>

      <section className="card compact-top" aria-label="Vendor results">
        {loading && <p>Memuat vendor... / Loading vendors...</p>}
        {error && <p className="err">{error}</p>}

        {!loading && !error && vendors.length === 0 && (
          <p>Belum ada vendor. Tambahkan data vendor di database lalu muat ulang halaman.</p>
        )}

        <ul className="vendor-grid">
          {vendors.map((vendor) => (
            <li key={vendor.id} className="vendor-card">
              <img
                className="vendor-cover"
                src="/images/vendor-placeholder.svg"
                alt={`Placeholder image for ${vendor.name}`}
              />
              <div className="vendor-body">
                <div className="row-wrap">
                  {vendor.is_verified && <span className="badge success">Verified Vendor</span>}
                  <span className="badge gold">Campus Business</span>
                </div>
                <h3>{vendor.name}</h3>
                <p className="vendor-meta">{vendor.category ?? "Uncategorized"} · {vendor.city ?? "Unknown city"}</p>
                <p>{vendor.description ?? "No description yet."}</p>
                <div className="vendor-actions">
                  <Link className="btn" href={`/directory/vendor/${vendor.id}`}>Lihat Detail / View Detail</Link>
                </div>
              </div>
            </li>
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
        initialError: "Supabase environment variables are missing",
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
      initialError: error?.message ?? null,
    },
  };
};
