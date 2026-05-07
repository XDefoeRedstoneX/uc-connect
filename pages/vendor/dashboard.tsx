import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type VendorData = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  city: string;
  is_verified: boolean;
  description: string;
  whatsapp: string;
  website_url: string | null;
  hero_image_url: string | null;
  created_at: string;
  metrics: {
    sample_rating: number;
    response_rate: number;
    avg_reply_time: number;
    review_count: number;
    updated_at: string;
  } | null;
  items: Array<{
    id: string;
    name: string;
    price: number;
    is_active: boolean;
  }>;
  itemCount: number;
  hours: Array<{
    id: string;
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    is_closed: boolean;
  }>;
};

export default function VendorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [vendor, setVendor] = useState<VendorData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        router.replace("/auth/login");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionToken = sessionData.session?.access_token;
      if (!sessionToken) {
        router.replace("/auth/login");
        return;
      }

      // Verify user is vendor
      const profileResponse = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const profileJson = await profileResponse.json();

      if (!profileResponse.ok || !profileJson.profile || profileJson.profile.role !== "vendor") {
        router.replace("/");
        return;
      }

      setToken(sessionToken);

      // Load vendor dashboard data
      const vendorResponse = await fetch("/api/vendor-dashboard", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const vendorJson = await vendorResponse.json();

      if (!vendorResponse.ok) {
        setError(typeof vendorJson.error === "string" ? vendorJson.error : "Gagal memuat data vendor.");
        setLoading(false);
        return;
      }

      setVendor(vendorJson.vendor);
      setLoading(false);
    };

    void loadData();
  }, [router]);

  if (loading) {
    return (
      <SiteLayout title="Vendor Dashboard | UC Connect">
        <section className="card">
          <p>Memuat dashboard...</p>
        </section>
      </SiteLayout>
    );
  }

  if (error) {
    return (
      <SiteLayout title="Vendor Dashboard | UC Connect">
        <section className="card">
          <p className="err">{error}</p>
          <button onClick={() => router.replace("/")} className="btn-primary mt-4">
            Kembali ke Beranda
          </button>
        </section>
      </SiteLayout>
    );
  }

  if (!vendor) {
    return (
      <SiteLayout title="Vendor Dashboard | UC Connect">
        <section className="card">
          <p className="err">Vendor tidak ditemukan.</p>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout title={`${vendor.name} Dashboard | UC Connect`}>
      <section className="w-full space-y-6">
        {/* Header Card */}
        <div className="rounded-xl bg-white p-6 shadow-md">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
                <p className="mt-1 text-sm text-gray-600">{vendor.tagline}</p>
                <p className="mt-2 text-sm text-gray-500">
                  <span className="font-semibold">{vendor.category}</span> • {vendor.city}
                </p>
                {vendor.is_verified && (
                  <p className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    ✓ Terverifikasi
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/vendor/profile/edit`)}
                  className="rounded-lg bg-(--brand-orange) px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                >
                  Edit Profil
                </button>
                <button
                  onClick={() => router.push(`/vendor/products`)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Kelola Produk
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Verification Status */}
          <div className="rounded-lg bg-white p-4 shadow-md">
            <p className="text-xs font-semibold uppercase text-gray-500">Status Verifikasi</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {vendor.is_verified ? "✓ Terverifikasi" : "Menunggu"}
            </p>
          </div>

          {/* Product Count */}
          <div className="rounded-lg bg-white p-4 shadow-md">
            <p className="text-xs font-semibold uppercase text-gray-500">Produk Aktif</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{vendor.itemCount}</p>
          </div>

          {/* Rating */}
          {vendor.metrics ? (
            <div className="rounded-lg bg-white p-4 shadow-md">
              <p className="text-xs font-semibold uppercase text-gray-500">Rating</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {vendor.metrics.sample_rating.toFixed(1)}
                <span className="text-sm text-gray-500"> / 5</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">{vendor.metrics.review_count} ulasan</p>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-4 shadow-md">
              <p className="text-xs font-semibold uppercase text-gray-500">Rating</p>
              <p className="mt-2 text-gray-500">Belum ada ulasan</p>
            </div>
          )}

          {/* Response Rate */}
          {vendor.metrics ? (
            <div className="rounded-lg bg-white p-4 shadow-md">
              <p className="text-xs font-semibold uppercase text-gray-500">Response Rate</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {(vendor.metrics.response_rate * 100).toFixed(0)}%
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-4 shadow-md">
              <p className="text-xs font-semibold uppercase text-gray-500">Response Rate</p>
              <p className="mt-2 text-gray-500">-</p>
            </div>
          )}
        </div>

        {/* Vendor Info */}
        <div className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Informasi Bisnis</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Deskripsi</p>
              <p className="mt-1 text-sm text-gray-700">{vendor.description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">WhatsApp</p>
                <p className="mt-1 text-sm text-gray-700">
                  <a href={`https://wa.me/${vendor.whatsapp.replace(/\D/g, "")}`} className="text-(--brand-orange) hover:underline">
                    {vendor.whatsapp}
                  </a>
                </p>
              </div>
              {vendor.website_url && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Website</p>
                  <p className="mt-1 text-sm text-gray-700">
                    <a href={vendor.website_url} target="_blank" rel="noopener noreferrer" className="text-(--brand-orange) hover:underline">
                      {vendor.website_url}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Products */}
        {vendor.items.length > 0 && (
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Produk Terbaru</h2>
            <div className="space-y-3">
              {vendor.items.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">Rp {item.price.toLocaleString("id-ID")}</p>
                  </div>
                  <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${item.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {item.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              ))}
            </div>
            {vendor.itemCount > 5 && (
              <button
                onClick={() => router.push(`/vendor/products`)}
                className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Lihat Semua Produk ({vendor.itemCount})
              </button>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => router.push(`/vendor/profile/edit`)}
            className="rounded-lg border border-gray-300 p-4 text-center transition hover:bg-gray-50"
          >
            <p className="text-2xl">📝</p>
            <p className="mt-2 font-semibold text-gray-900">Edit Profil</p>
          </button>
          <button
            onClick={() => router.push(`/vendor/products`)}
            className="rounded-lg border border-gray-300 p-4 text-center transition hover:bg-gray-50"
          >
            <p className="text-2xl">📦</p>
            <p className="mt-2 font-semibold text-gray-900">Kelola Produk</p>
          </button>
          <button
            onClick={() => router.push(`/vendor/orders`)}
            className="rounded-lg border border-gray-300 p-4 text-center transition hover:bg-gray-50"
          >
            <p className="text-2xl">📋</p>
            <p className="mt-2 font-semibold text-gray-900">Pesanan</p>
          </button>
          <button
            onClick={() => router.push(`/support`)}
            className="rounded-lg border border-gray-300 p-4 text-center transition hover:bg-gray-50"
          >
            <p className="text-2xl">💬</p>
            <p className="mt-2 font-semibold text-gray-900">Dukungan</p>
          </button>
        </div>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
