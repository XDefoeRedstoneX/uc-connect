"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AdminNav from "@/components/admin/AdminNav";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import LoadingScreen from "@/components/LoadingScreen";
import { useToast } from "@/components/ToastProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ExpoSignup = { vendorId: string; vendorName: string; email: string; slug: string; ts: number };
type ExpoData = { enabled: boolean; token: string; signupUrl: string; ttlMs: number; signups: ExpoSignup[] };

// Re-mint the QR token well within its lifetime so a freshly scanned code is
// always valid; the server TTL is 10 min, we refresh every 2.
const REFRESH_MS = 2 * 60 * 1000;

export default function AdminExpoPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ExpoData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const fetchData = useCallback(async (authToken: string) => {
    const res = await fetch("/api/admin/expo-qr", { headers: { Authorization: `Bearer ${authToken}` } });
    if (res.status === 403) { void router.replace("/unauthorized"); return; }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Gagal memuat data Expo QR.");
      setLoading(false);
      return;
    }
    const json = (await res.json()) as ExpoData;
    setData(json);
    setError(null);
    setLoading(false);
  }, [router]);

  // Initial auth + load.
  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      setToken(tok);
      tokenRef.current = tok;
      await fetchData(tok);
    };
    void init();
  }, [router, fetchData]);

  // Rotate the token on an interval so a stale screenshot can't be reused.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      if (tokenRef.current) void fetchData(tokenRef.current);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [token, fetchData]);

  // Render the QR image whenever the signup URL changes.
  useEffect(() => {
    if (!data?.signupUrl) { setQrDataUrl(null); return; }
    let cancelled = false;
    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(data.signupUrl, { width: 320, margin: 2, errorCorrectionLevel: "M" });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [data?.signupUrl]);

  async function toggle(enable: boolean) {
    if (!token) return;
    setToggling(true);
    try {
      const res = await fetch("/api/admin/expo-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: enable ? "enable" : "disable" }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error ?? "Gagal mengubah status.", "error"); return; }
      setData((d) => (d ? { ...d, enabled: json.enabled } : d));
      showToast(enable ? "Pendaftaran Expo diaktifkan." : "Pendaftaran Expo dimatikan.");
    } finally {
      setToggling(false);
    }
  }

  async function removeSignup(s: ExpoSignup) {
    if (!token) return;
    const res = await fetch("/api/admin/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vendor_id: s.vendorId, action: "reject" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { showToast(json.error ?? "Gagal menghapus vendor.", "error"); return; }
    showToast(`"${s.vendorName}" dihapus.`);
    if (tokenRef.current) void fetchData(tokenRef.current);
  }

  function copyLink() {
    if (!data?.signupUrl) return;
    void navigator.clipboard?.writeText(data.signupUrl).then(
      () => showToast("Link disalin."),
      () => showToast("Gagal menyalin link.", "error"),
    );
  }

  if (loading) return (
    <SiteLayout title="Expo QR | UC Connect"><LoadingScreen message="Memuat Expo QR..." /></SiteLayout>
  );
  if (error) return (
    <SiteLayout title="Expo QR | UC Connect">
      <AdminNav current="expo" />
      <EmptyState icon="alert-triangle" title={error} description="Pastikan EXPO_QR_SECRET sudah diatur di server, lalu muat ulang." />
    </SiteLayout>
  );

  const enabled = data?.enabled ?? false;

  return (
    <SiteLayout title="Expo QR | UC Connect">
      <AdminNav current="expo" />

      <section className="hero" style={{ marginBottom: "1.5rem" }}>
        <span className="kicker" style={{ position: "relative", zIndex: 1 }}>
          <Icon name="qr-code" size={14} strokeWidth={2.6} /> Pendaftaran Kilat
        </span>
        <h1 className="display" style={{ position: "relative", zIndex: 1, fontSize: "var(--fs-h1)", margin: "0.5rem 0 0" }}>Expo QR</h1>
        <p style={{ color: "var(--muted)", position: "relative", zIndex: 1, marginTop: "0.5rem", maxWidth: "46ch" }}>
          Tunjukkan QR ini ke pemilik usaha di stand. Mereka scan, isi sebentar, dan langsung tampil terverifikasi di direktori — tanpa antre verifikasi.
        </p>
      </section>

      <div className="split-main-aside">
        {/* QR + status */}
        <div className="dash-card" style={{ textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.45rem", marginBottom: "1rem",
            padding: "0.35rem 0.85rem", borderRadius: "999px", fontWeight: 700, fontSize: "0.82rem",
            background: enabled ? "#f0fdf4" : "var(--orange-soft)",
            color: enabled ? "#166534" : "var(--orange-dark)",
            border: `1.5px solid ${enabled ? "#bbf7d0" : "var(--orange-light)"}`,
          }}>
            <Icon name={enabled ? "check-circle" : "lock"} size={15} strokeWidth={2.4} />
            {enabled ? "Pendaftaran AKTIF" : "Pendaftaran NONAKTIF"}
          </div>

          <div style={{ position: "relative", width: 320, maxWidth: "100%", margin: "0 auto", aspectRatio: "1 / 1" }}>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR pendaftaran Expo" width={320} height={320}
                style={{ width: "100%", height: "auto", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", filter: enabled ? "none" : "grayscale(1) opacity(0.4)" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", border: "1.5px dashed var(--border)", borderRadius: "var(--radius-md)" }}>
                <Icon name="qr-code" size={48} strokeWidth={1.5} style={{ color: "var(--muted)" }} />
              </div>
            )}
            {!enabled && (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                <span style={{ background: "var(--orange-dark)", color: "#fff", fontWeight: 700, fontSize: "0.8rem", padding: "0.3rem 0.7rem", borderRadius: "999px" }}>
                  Aktifkan dulu
                </span>
              </div>
            )}
          </div>

          <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
            <Icon name="refresh-cw" size={13} strokeWidth={2.4} /> Kode berganti otomatis tiap 2 menit
          </p>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
            {enabled ? (
              <Button variant="danger" icon="power" onClick={() => toggle(false)} disabled={toggling}>
                Matikan Pendaftaran
              </Button>
            ) : (
              <Button icon="power" onClick={() => toggle(true)} disabled={toggling}>
                Aktifkan Pendaftaran
              </Button>
            )}
            <Button variant="secondary" icon="file-text" onClick={copyLink}>Salin Link</Button>
          </div>
        </div>

        {/* Recent signups audit */}
        <aside className="dash-card">
          <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--fs-h4)" }}>
            <Icon name="store" size={18} strokeWidth={2.3} /> Daftar Masuk Terbaru
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "-0.25rem" }}>
            Vendor yang baru mendaftar lewat QR. Hapus jika ada yang tidak sah.
          </p>

          {!data || data.signups.length === 0 ? (
            <EmptyState icon="qr-code" title="Belum ada pendaftaran" description="Pendaftaran lewat QR akan muncul di sini secara real-time." />
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 0", display: "grid", gap: "0.5rem" }}>
              {data.signups.map((s) => (
                <li key={`${s.vendorId}-${s.ts}`} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
                  border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.8rem",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/directory/vendor/${s.vendorId}`} style={{ fontWeight: 700, textDecoration: "none", color: "inherit" }}>
                      {s.vendorName}
                    </Link>
                    <p style={{ margin: "0.1rem 0 0", fontSize: "0.78rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.email} · {new Date(s.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button onClick={() => void removeSignup(s)} aria-label={`Hapus ${s.vendorName}`} title="Hapus vendor"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--orange-dark)", display: "flex", padding: "0.3rem" }}>
                    <Icon name="trash" size={17} strokeWidth={2.3} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
