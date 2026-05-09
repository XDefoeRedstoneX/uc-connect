import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { GetServerSideProps } from "next";

const FAQ = [
  { q: "Bagaimana cara mendaftar sebagai vendor?", a: "Buka halaman profil Anda, lalu klik 'Daftar Sebagai Vendor'. Anda perlu mengupload KTM dan mengisi data bisnis. Setelah itu, admin akan memverifikasi pendaftaran Anda." },
  { q: "Apakah UC Connect memungut biaya?", a: "Saat ini UC Connect sepenuhnya gratis untuk vendor dan pengguna. Kami mungkin memperkenalkan fitur premium di masa depan." },
  { q: "Bagaimana jika saya lupa password?", a: "Klik 'Lupa Password' di halaman login. Kami akan mengirimkan link reset ke email Anda." },
  { q: "Bagaimana cara menghapus akun saya?", a: "Hubungi kami melalui form di bawah ini dengan permintaan penghapusan akun. Kami akan memproses dalam 7 hari kerja." },
  { q: "Apakah data saya aman?", a: "Ya. Kami menggunakan Supabase dengan Row Level Security dan koneksi HTTPS. Baca selengkapnya di halaman Kebijakan Privasi." },
];

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent("UC Connect Support Request");
    const body = encodeURIComponent(`From: ${email}\n\n${message}`);
    window.location.href = `mailto:support@uc-connect.local?subject=${subject}&body=${body}`;
    setStatus("Email client Anda telah dibuka.");
  }

  return (
    <SiteLayout title="Support | UC Connect" description="Bantuan dan dukungan untuk pengguna UC Connect.">
      <section className="hero bubble-section">
        <h1 style={{ position: "relative", zIndex: 1 }}>💬 Bantuan & Support</h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1 }}>
          Punya pertanyaan? Cek FAQ atau hubungi kami.
        </p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr min(400px, 100%)", gap: "1.25rem", alignItems: "start" }}>
        {/* FAQ */}
        <section className="card compact-top">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>❓ Pertanyaan Umum (FAQ)</h2>
          <div className="stack" style={{ gap: "0.5rem" }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{
                background: openFaq === i ? "var(--pacific-soft)" : "var(--bg)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${openFaq === i ? "rgba(28,169,201,0.2)" : "var(--border)"}`,
                overflow: "hidden", transition: "all 0.2s ease",
              }}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left", padding: "0.85rem 1rem",
                    background: "none", border: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.9rem", color: "var(--text)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                  <span>{item.q}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", transition: "transform 0.2s", transform: openFaq === i ? "rotate(180deg)" : "none" }}>▼</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 1rem 0.85rem", color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact form */}
        <section className="card compact-top" style={{ position: "sticky", top: "5rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>📧 Hubungi Kami</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "1rem" }}>
            Tidak menemukan jawaban? Kirim pesan dan kami akan segera merespon.
          </p>
          <form onSubmit={onSubmit} className="stack" style={{ gap: "0.75rem" }}>
            <label>
              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted)" }}>Email Anda *</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
                placeholder="email@contoh.com" style={{ marginTop: "0.3rem" }} />
            </label>
            <label>
              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted)" }}>Pesan *</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required
                placeholder="Jelaskan pertanyaan atau masalah Anda..." style={{ marginTop: "0.3rem", width: "100%" }} />
            </label>
            <button type="submit">Kirim Pesan</button>
          </form>
          {status && <p className="ok" style={{ marginTop: "0.75rem" }}>{status}</p>}
        </section>
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
