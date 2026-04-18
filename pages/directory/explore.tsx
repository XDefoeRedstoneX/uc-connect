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
      <section className="card">
        <h1>Explore Vendors</h1>
        <form onSubmit={onSearch} className="row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or description" />
          <button type="submit">Search</button>
        </form>

        {loading && <p>Loading vendors...</p>}
        {error && <p className="err">{error}</p>}

        {!loading && !error && vendors.length === 0 && (
          <p>No vendors yet. Seed your database and refresh.</p>
        )}

        <ul className="list">
          {vendors.map((vendor) => (
            <li key={vendor.id} className="list-item">
              <div>
                <h3>{vendor.name}</h3>
                <p>{vendor.category ?? "Uncategorized"} · {vendor.city ?? "Unknown city"}</p>
              </div>
              <Link className="btn" href={`/directory/vendor/${vendor.id}`}>View detail</Link>
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
