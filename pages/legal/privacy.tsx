import SiteLayout from "@/components/SiteLayout";
import { GetServerSideProps } from "next";

export default function PrivacyPage() {
  return (
    <SiteLayout title="Kebijakan Privasi | UC Connect" description="Kebijakan privasi dan perlindungan data pengguna UC Connect.">
      <section className="hero bubble-section">
        <h1 style={{ position: "relative", zIndex: 1 }}>🔒 Kebijakan Privasi</h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1 }}>
          Terakhir diperbarui: 8 Mei 2026
        </p>
      </section>

      <section className="card compact-top" style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div className="stack" style={{ gap: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>1. Data yang Kami Kumpulkan</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              UC Connect mengumpulkan data berikut saat Anda mendaftar dan menggunakan platform:
            </p>
            <ul style={{ color: "var(--muted)", lineHeight: 1.8, paddingLeft: "1.25rem" }}>
              <li><strong>Informasi akun:</strong> Nama lengkap, email, username, nomor telepon</li>
              <li><strong>Profil bisnis (vendor):</strong> Nama usaha, kategori, kota, deskripsi, jam operasional</li>
              <li><strong>Konten:</strong> Posting forum, balasan, dan favorit vendor</li>
              <li><strong>Teknis:</strong> Alamat IP, browser, dan perangkat untuk keamanan</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>2. Penggunaan Data</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Data Anda digunakan untuk:
            </p>
            <ul style={{ color: "var(--muted)", lineHeight: 1.8, paddingLeft: "1.25rem" }}>
              <li>Menyediakan dan menjalankan layanan direktori serta forum</li>
              <li>Memverifikasi identitas vendor mahasiswa</li>
              <li>Mengirim notifikasi terkait akun Anda</li>
              <li>Meningkatkan kualitas platform berdasarkan analitik penggunaan</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>3. Penyimpanan & Keamanan</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Data disimpan dengan aman menggunakan <strong>Supabase</strong> dengan Row Level Security (RLS). 
              Koneksi dilindungi dengan HTTPS/TLS. Kami tidak menjual data Anda kepada pihak ketiga.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>4. Hak Pengguna</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>Anda berhak untuk:</p>
            <ul style={{ color: "var(--muted)", lineHeight: 1.8, paddingLeft: "1.25rem" }}>
              <li>Mengakses dan mengedit data profil Anda kapan saja</li>
              <li>Meminta penghapusan akun dan semua data terkait</li>
              <li>Menolak notifikasi promosi</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--pacific-dark)" }}>5. Kontak</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
              Untuk pertanyaan terkait privasi, hubungi kami melalui halaman <a href="/support" style={{ color: "var(--pacific)" }}>Support</a>.
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
