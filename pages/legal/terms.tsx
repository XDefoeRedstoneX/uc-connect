import SiteLayout from "@/components/SiteLayout";
import { GetServerSideProps } from "next";

export default function TermsPage() {
  return (
    <SiteLayout title="Syarat & Ketentuan | UC Connect" description="Syarat dan ketentuan penggunaan platform UC Connect.">
      <section className="hero bubble-section">
        <h1 style={{ position: "relative", zIndex: 1 }}>📋 Syarat & Ketentuan</h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1 }}>
          Terakhir diperbarui: 8 Mei 2026
        </p>
      </section>

      <section className="card compact-top" style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div className="stack" style={{ gap: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>1. Penerimaan Ketentuan</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Dengan menggunakan UC Connect, Anda menyetujui syarat dan ketentuan ini. Jika tidak setuju, 
              harap tidak menggunakan platform ini.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>2. Pendaftaran Akun</h2>
            <ul style={{ color: "var(--muted)", lineHeight: 1.8, paddingLeft: "1.25rem" }}>
              <li>Anda harus memberikan informasi yang akurat saat mendaftar</li>
              <li>Satu orang hanya boleh memiliki satu akun</li>
              <li>Anda bertanggung jawab atas keamanan akun Anda</li>
              <li>Vendor harus merupakan mahasiswa aktif dengan KTM yang valid</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>3. Konten Pengguna</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Anda bertanggung jawab penuh atas konten yang Anda posting di forum maupun profil vendor. 
              Konten berikut <strong>dilarang</strong>:
            </p>
            <ul style={{ color: "var(--muted)", lineHeight: 1.8, paddingLeft: "1.25rem" }}>
              <li>Ujaran kebencian, diskriminasi, atau konten SARA</li>
              <li>Spam, iklan berlebihan, atau konten menyesatkan</li>
              <li>Konten yang melanggar hak cipta atau hak kekayaan intelektual</li>
              <li>Informasi palsu atau penipuan</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>4. Vendor</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Vendor yang terdaftar harus memenuhi ketentuan berikut:
            </p>
            <ul style={{ color: "var(--muted)", lineHeight: 1.8, paddingLeft: "1.25rem" }}>
              <li>Produk dan layanan harus sesuai dengan deskripsi yang ditampilkan</li>
              <li>Harga harus transparan dan akurat</li>
              <li>Vendor bertanggung jawab atas transaksi yang dilakukan di luar platform</li>
              <li>UC Connect berhak mencabut status verifikasi vendor yang melanggar ketentuan</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>5. Batasan Tanggung Jawab</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              UC Connect adalah platform direktori dan tidak bertanggung jawab atas transaksi antara pembeli dan vendor. 
              Semua transaksi dilakukan atas risiko masing-masing pihak.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>6. Perubahan Ketentuan</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              UC Connect berhak mengubah syarat dan ketentuan ini kapan saja. Perubahan akan diumumkan melalui platform.
              Penggunaan berkelanjutan setelah perubahan berarti Anda menyetujui ketentuan baru.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>7. Kontak</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Pertanyaan? Hubungi kami melalui halaman <a href="/support" style={{ color: "var(--pacific)" }}>Support</a>.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
