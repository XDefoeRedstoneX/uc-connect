"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import FormField from "@/components/FormField";
import LoadingScreen from "@/components/LoadingScreen";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { compressAvatar } from "@/lib/compress-image";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type TokenState = "checking" | "valid" | "invalid" | "disabled";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export default function ExpoSignupPage() {
  const router = useRouter();
  const logoRef = useRef<HTMLInputElement>(null);

  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [token, setToken] = useState<string>("");

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Validate the QR token on load so we never let someone fill the whole form
  // behind an expired code.
  useEffect(() => {
    if (!router.isReady) return;
    const t = typeof router.query.t === "string" ? router.query.t : "";
    setToken(t);
    if (!t) { setTokenState("invalid"); return; }
    void (async () => {
      try {
        const res = await fetch(`/api/expo/status?t=${encodeURIComponent(t)}`);
        const json = await res.json();
        if (json.valid) setTokenState("valid");
        else setTokenState(json.reason === "disabled" ? "disabled" : "invalid");
      } catch {
        setTokenState("invalid");
      }
    })();
  }, [router.isReady, router.query.t]);

  async function handleLogo(file: File | null) {
    if (!file) return;
    try {
      const compressed = await compressAvatar(file);
      setLogoFile(compressed);
      setLogoPreview(URL.createObjectURL(compressed));
    } catch {
      setError("Gagal memproses gambar logo.");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) { setError("Kata sandi minimal 8 karakter."); return; }
    setSubmitting(true);

    try {
      const logoDataUrl = logoFile ? await fileToDataUrl(logoFile) : undefined;
      const res = await fetch("/api/expo/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, businessName, email, password, whatsapp, description, logoDataUrl }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403) setTokenState("invalid");
        setError(typeof json.error === "string" ? json.error : "Gagal mendaftar. Coba lagi.");
        setSubmitting(false);
        return;
      }

      // Success — sign them straight in and drop them on their dashboard.
      setDone(true);
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) { router.replace("/vendor/dashboard"); return; }
      }
      router.replace("/auth/login?next=/vendor/dashboard");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setSubmitting(false);
    }
  }

  if (tokenState === "checking") {
    return <SiteLayout title="Daftar Vendor | UC Connect"><LoadingScreen message="Memeriksa QR..." /></SiteLayout>;
  }

  if (tokenState === "invalid" || tokenState === "disabled") {
    return (
      <SiteLayout title="Daftar Vendor | UC Connect">
        <EmptyState
          icon="qr-code"
          title={tokenState === "disabled" ? "Pendaftaran sedang ditutup" : "QR tidak valid atau kedaluwarsa"}
          description={tokenState === "disabled"
            ? "Pendaftaran lewat QR sedang dimatikan. Silakan hubungi panitia di stand UC Connect."
            : "Minta panitia di stand untuk menampilkan ulang QR-nya, lalu scan sekali lagi."}
        />
      </SiteLayout>
    );
  }

  if (done) {
    return (
      <SiteLayout title="Berhasil | UC Connect">
        <LoadingScreen message="Akun dibuat! Mengarahkan ke dashboard..." />
      </SiteLayout>
    );
  }

  return (
    <SiteLayout title="Daftar Vendor | UC Connect">
      <section className="hero" style={{ marginBottom: "1.5rem" }}>
        <span className="kicker" style={{ position: "relative", zIndex: 1 }}>
          <Icon name="sparkles" size={14} strokeWidth={2.6} /> Pendaftaran Kilat
        </span>
        <h1 className="display" style={{ position: "relative", zIndex: 1, fontSize: "var(--fs-h1)", margin: "0.5rem 0 0" }}>
          Daftarkan Usahamu
        </h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1, marginTop: "0.5rem", maxWidth: "44ch" }}>
          Isi sebentar dan langsung tampil di direktori UC Connect — tanpa antre verifikasi. Sisanya bisa kamu lengkapi nanti dari dashboard.
        </p>
      </section>

      <section className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <form onSubmit={onSubmit} className="stack" style={{ gap: "1.1rem" }} aria-label="Form pendaftaran kilat">
          {/* Logo */}
          <div>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Logo / Foto Usaha (opsional)</span>
            <button type="button" onClick={() => logoRef.current?.click()} style={{
              marginTop: "0.4rem", width: "100%", display: "flex", alignItems: "center", gap: "0.9rem",
              border: "1.5px dashed var(--border)", borderRadius: "var(--radius-md)", padding: "0.8rem",
              background: "transparent", cursor: "pointer", textAlign: "left",
            }}>
              <span style={{
                width: 56, height: 56, borderRadius: "var(--radius-md)", overflow: "hidden", flexShrink: 0,
                display: "grid", placeItems: "center", background: "var(--pacific-soft, #eef6fb)", color: "var(--pacific)",
              }}>
                {logoPreview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={logoPreview} alt="Pratinjau logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Icon name="camera" size={22} strokeWidth={2.2} />}
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
                {logoFile ? "Ganti foto" : "Ambil foto / pilih dari galeri"}
              </span>
            </button>
            <input ref={logoRef} type="file" accept="image/*" hidden
              onChange={(e) => void handleLogo(e.target.files?.[0] ?? null)} />
          </div>

          <FormField id="x-name" label="Nama Usaha" value={businessName}
            onChange={(e) => setBusinessName(e.target.value)} required maxLength={120} placeholder="cth. Kopi Senja" />

          <label htmlFor="x-desc">
            <span>Deskripsi Singkat</span>
            <textarea id="x-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              required minLength={10} maxLength={150} rows={3} placeholder="Jualan apa? cth. Kopi susu & pastry buatan sendiri" />
            <p className="inline-note">{description.length}/150</p>
          </label>

          <FormField id="x-wa" label="Nomor WhatsApp" type="tel" value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)} required placeholder="08xxxxxxxxxx" />

          <hr style={{ border: "none", borderTop: "1.5px solid var(--border)", margin: "0.25rem 0" }} />

          <FormField id="x-email" label="Email (untuk login)" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required placeholder="nama@email.com" />

          <FormField id="x-pass" label="Kata Sandi" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Minimal 8 karakter" />

          {error && <p className="err">{error}</p>}

          <Button type="submit" icon="check" fullWidth disabled={submitting}>
            {submitting ? "Mendaftarkan..." : "Daftar & Tampilkan Sekarang"}
          </Button>

          <p style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "center", margin: 0 }}>
            Dengan mendaftar kamu menyetujui Ketentuan & Kebijakan Privasi UC Connect.
          </p>
        </form>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
