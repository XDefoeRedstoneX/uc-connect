import { useState } from "react";
import { useRouter } from "next/router";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function BottomCTA() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleVendorRegister() {
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      await router.push("/auth/register?type=vendor");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      await router.push("/auth/register?type=vendor");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok || !data.profile) {
      await router.push("/auth/login");
      setLoading(false);
      return;
    }

    if (data.profile.role === "vendor") {
      await router.push("/vendor/dashboard");
      setLoading(false);
      return;
    }

    await router.push("/vendor/onboarding");
    setLoading(false);
  }
  return (
    <section className="bg-orange-50 py-16 px-4 sm:px-6 lg:px-8 text-center">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Punya Bisnis Kampus?
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Daftarkan UMKM mahasiswa Anda dan jangkau ribuan pelanggan potensial di UC Connect. 
          Kelola pesanan, terima pembayaran, dan berkembang bersama komunitas kami.
        </p>
        <button
          type="button"
          onClick={handleVendorRegister}
          disabled={loading}
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Loading..." : "Daftar Sebagai Vendor"}
        </button>
      </div>
    </section>
  );
}
