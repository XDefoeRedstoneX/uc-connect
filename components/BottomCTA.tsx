import Link from "next/link";

export default function BottomCTA() {
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
        <Link href="/auth/register?type=vendor" className="inline-flex justify-center">
          <button className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200">
            Daftar Sebagai Vendor
          </button>
        </Link>
      </div>
    </section>
  );
}
