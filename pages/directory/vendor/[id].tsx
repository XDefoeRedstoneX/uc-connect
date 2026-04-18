import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { Vendor } from "@/types/domain";

export default function VendorDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof id !== "string") return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/vendors/${id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to load vendor");
        setLoading(false);
        return;
      }

      setVendor(data.vendor ?? null);
      setLoading(false);
    };

    void load();
  }, [id]);

  return (
    <SiteLayout title="Vendor Detail | UC Connect">
      <section className="card">
        <h1>Vendor Detail</h1>

        {loading && <p>Loading...</p>}
        {error && <p className="err">{error}</p>}

        {!loading && !error && !vendor && <p>Vendor not found.</p>}

        {vendor && (
          <div className="stack compact-top">
            <h2>{vendor.name}</h2>
            <p>{vendor.description ?? "No description yet."}</p>
            <p>Category: {vendor.category ?? "Uncategorized"}</p>
            <p>City: {vendor.city ?? "Unknown city"}</p>
            <p>Verified: {vendor.is_verified ? "Yes" : "No"}</p>
            {vendor.whatsapp ? (
              <a className="btn" href={`https://wa.me/${vendor.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                Contact on WhatsApp
              </a>
            ) : (
              <button type="button" disabled>No WhatsApp number</button>
            )}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
