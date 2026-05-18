"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import LoadingScreen from "@/components/LoadingScreen";
import VendorCard from "@/components/VendorCard";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Vendor } from "@/types/domain";

export default function FavoritesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      setToken(tok);

      // Fetch favorites
      const favRes = await fetch("/api/favorites", { headers: { Authorization: `Bearer ${tok}` } });
      if (!favRes.ok) { setLoading(false); return; }
      const favJson = await favRes.json();
      const ids: string[] = favJson.vendorIds ?? [];
      setFavIds(new Set(ids));

      if (ids.length === 0) { setLoading(false); return; }

      // Fetch vendor details for each favorite
      const vendorRes = await fetch("/api/vendors");
      if (vendorRes.ok) {
        const vj = await vendorRes.json();
        const allVendors: Vendor[] = vj.vendors ?? [];
        setVendors(allVendors.filter(v => ids.includes(v.id)));
      }
      setLoading(false);
    };
    void init();
  }, [router]);

  async function toggleFav(vendorId: string) {
    if (!token) return;
    const isFav = favIds.has(vendorId);
    setFavIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(vendorId); else next.add(vendorId);
      return next;
    });
    if (isFav) {
      setVendors(prev => prev.filter(v => v.id !== vendorId));
    }
    await fetch("/api/favorites", {
      method: isFav ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vendor_id: vendorId }),
    });
  }

  if (loading) return (
    <SiteLayout title="Favorit Saya | UC Connect">
      <LoadingScreen message="Memuat favorit..." />
    </SiteLayout>
  );

  return (
    <SiteLayout title="Favorit Saya | UC Connect" description="Lihat vendor yang telah Anda favoritkan di UC Connect.">
      <section className="hero bubble-section">
        <h1 style={{ position: "relative", zIndex: 1 }}>❤️ Favorit Saya</h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1 }}>
          Vendor yang telah Anda simpan.
        </p>
      </section>

      <section className="card compact-top">
        {vendors.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "3rem 1rem",
            background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)",
          }}>
            <p style={{ fontSize: "2.5rem", margin: "0 0 0.5rem" }}>🤍</p>
            <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Belum ada vendor favorit.</p>
            <button onClick={() => router.push("/directory/explore")}>
              Jelajahi Vendor →
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              {vendors.length} vendor difavoritkan
            </p>
            <ul className="vendor-grid vendor-grid--explore">
              {vendors.map(vendor => (
                <VendorCard
                  key={vendor.id}
                  title={vendor.name}
                  meta={vendor.tagline ?? `${vendor.category ?? "Uncategorized"} · ${vendor.city ?? "Unknown"}`}
                  href={`/directory/vendor/${vendor.id}`}
                  imageSrc={vendor.hero_image_url ?? "/images/vendor-placeholder.svg"}
                  description={vendor.description ?? ""}
                  badges={vendor.is_verified ? [{ tone: "success", text: "✓ Terverifikasi" }] : []}
                  ctaLabel="Lihat Detail"
                  isFavorited={favIds.has(vendor.id)}
                  onToggleFavorite={() => toggleFav(vendor.id)}
                />
              ))}
            </ul>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
