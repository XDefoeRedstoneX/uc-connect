"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AccountNav from "@/components/AccountNav";
import SkeletonList from "@/components/SkeletonList";
import VendorCard from "@/components/VendorCard";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
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
      <AccountNav current="favorites" />
      <section className="card compact-top"><SkeletonList rows={3} /></section>
    </SiteLayout>
  );

  return (
    <SiteLayout title="Favorit Saya | UC Connect" description="Lihat vendor yang telah Anda favoritkan di UC Connect.">
      <AccountNav current="favorites" />
      <section className="hero">
        <span className="kicker" style={{ position: "relative", zIndex: 1 }}>
          <Icon name="heart" size={14} strokeWidth={2.6} /> Tersimpan
        </span>
        <h1 className="display" style={{ position: "relative", zIndex: 1, fontSize: "var(--fs-h1)", margin: "0.5rem 0 0" }}>Favorit Saya</h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1, marginTop: "0.5rem" }}>
          Vendor yang telah Anda simpan.
        </p>
      </section>

      <section style={{ marginTop: "1.75rem" }}>
        {vendors.length === 0 ? (
          <EmptyState
            icon="heart"
            title="Belum ada favorit"
            description="Simpan vendor yang kamu suka agar mudah ditemukan kembali."
            action={<Button href="/directory/explore" iconRight="arrow-right">Jelajahi Vendor</Button>}
          />
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
                  badges={vendor.is_verified ? [{ tone: "success", text: "Terverifikasi" }] : []}
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
