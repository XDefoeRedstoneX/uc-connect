"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import SiteLayout from "@/components/SiteLayout";
import AdminNav from "@/components/admin/AdminNav";
import Icon, { type IconName } from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AdminVendor = {
  id: string; slug: string; name: string; tagline: string | null;
  category: string | null; city: string | null; whatsapp: string | null;
  is_verified: boolean; created_at: string; owner_id: string | null;
  university: string | null; ktm_url: string | null;
  owner_email: string | null;
  archived_at: string | null;
  archive_reason: "unresponsive" | "admin" | "self" | "duplicate" | "spam" | null;
  last_confirmed_at: string | null;
  confirmation_sent_at: string | null;
  profiles: { full_name: string | null; username: string | null } | null;
};

type LifecycleFilter = "pending" | "verified" | "all" | "pending_confirmation" | "archived";

export default function AdminVendorsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [token, setToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<LifecycleFilter>("pending");

  // Sync the filter from the URL once router is ready, so deep-links from the
  // admin dashboard (e.g. /admin/vendors?status=verified) land on the right tab.
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.status;
    if (q === "verified" || q === "all" || q === "pending" || q === "archived" || q === "pending_confirmation") {
      setFilter(q);
    }
  }, [router.isReady, router.query.status]);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadVendors(tok: string, status: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/vendors?status=${status}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 403) { void router.replace("/unauthorized"); return; }
    if (res.ok) { const j = await res.json(); setVendors(j.vendors ?? []); }
    setLoading(false);
  }

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { void router.replace("/auth/login"); return; }
      const { data: sd } = await supabase.auth.getSession();
      const tok = sd.session?.access_token;
      if (!tok) { void router.replace("/auth/login"); return; }
      setToken(tok);
      await loadVendors(tok, filter);
    };
    void init();
  }, [router]);

  useEffect(() => { if (token) void loadVendors(token, filter); }, [filter]);

  async function viewKtm(vendorId: string) {
    if (!token) return;
    const res = await fetch(`/api/admin/vendors/ktm?vendor_id=${vendorId}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.url) window.open(j.url, "_blank", "noopener,noreferrer");
    else showToast(j.error ?? "Gagal membuka KTM", "error");
  }

  async function act(vendorId: string, action: "approve" | "reject" | "archive" | "reactivate") {
    if (!token) return;
    if (action === "reject") {
      const ok = await confirm({
        title: "Tolak & hapus vendor ini?",
        message: "Vendor akan dihapus dan role pemiliknya dikembalikan ke customer.",
        confirmLabel: "Tolak Vendor",
        destructive: true,
      });
      if (!ok) return;
    } else if (action === "archive") {
      const ok = await confirm({
        title: "Arsipkan vendor?",
        message: "Vendor disembunyikan dari direktori publik tapi data tetap ada. Bisa diaktifkan kembali kapan saja.",
        confirmLabel: "Arsipkan",
        destructive: true,
      });
      if (!ok) return;
    }
    setActionId(vendorId);
    const res = await fetch("/api/admin/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vendor_id: vendorId, action }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      if (action === "reject" || action === "archive") {
        // Both remove the row from the current view (reject hard-deletes; archive
        // moves it into the "Archived" tab, which the user can switch to).
        setVendors(prev => prev.filter(v => v.id !== vendorId));
      } else if (action === "approve") {
        setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, is_verified: true } : v));
      } else if (action === "reactivate") {
        setVendors(prev => prev.filter(v => v.id !== vendorId));
      }
      showToast(
        action === "approve" ? "Vendor disetujui." :
        action === "reject" ? "Vendor ditolak." :
        action === "archive" ? "Vendor diarsipkan." : "Vendor diaktifkan kembali.",
      );
    } else {
      showToast(json.error ?? "Gagal memproses aksi", "error");
    }
    setActionId(null);
  }

  return (
    <SiteLayout title="Verifikasi Vendor | Admin">
      <AdminNav current="vendors" />

      <div className="dash-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <Icon name="store" size={20} strokeWidth={2.2} /> Vendor Management
          </h2>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {(
              [
                { id: "pending",              label: "Pending",     icon: "clock" },
                { id: "verified",             label: "Verified",    icon: "check" },
                { id: "pending_confirmation", label: "Menunggu konfirmasi", icon: "mail" },
                { id: "all",                  label: "Aktif",       icon: "grid" },
                { id: "archived",             label: "Arsip",       icon: "package" },
              ] as { id: LifecycleFilter; label: string; icon: IconName }[]
            ).map(f => (
              <button key={f.id} type="button" className="chip" onClick={() => setFilter(f.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.3rem", cursor: "pointer",
                  background: filter === f.id ? "var(--pacific-soft)" : "#fff",
                  borderColor: filter === f.id ? "var(--pacific)" : undefined,
                  fontWeight: filter === f.id ? 700 : 600,
                }}>
                <Icon name={f.icon} size={13} strokeWidth={2.4} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Memuat...</p>
        ) : vendors.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title={filter === "pending" ? "Tidak ada antrean verifikasi" : "Tidak ada vendor"}
            description={filter === "pending" ? "Semua vendor sudah ditinjau. Mantap!" : "Belum ada vendor pada filter ini."}
          />
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {vendors.map(v => (
              <div key={v.id} className="product-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                    <p className="product-name" style={{ margin: 0 }}>{v.name}</p>
                    {v.archived_at
                      ? <Badge tone="gold" icon="package">Archived · {v.archive_reason ?? "admin"}</Badge>
                      : v.is_verified
                        ? <Badge tone="success" icon="check">Verified</Badge>
                        : <Badge tone="gold" icon="clock">Pending</Badge>}
                    {!v.archived_at && v.confirmation_sent_at && (
                      <Badge tone="pacific" icon="mail">Menunggu konfirmasi</Badge>
                    )}
                  </div>
                  {v.tagline && <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0 0 0.25rem" }}>{v.tagline}</p>}
                  <div className="row-wrap" style={{ gap: "0.35rem", fontSize: "0.8rem", alignItems: "center" }}>
                    {v.category && <Badge tone="pacific">{v.category}</Badge>}
                    {v.university && <Badge tone="pacific" icon="graduation-cap">{v.university}</Badge>}
                    {v.city && <Badge tone="pacific" icon="map-pin">{v.city}</Badge>}
                    {v.whatsapp && (
                      <span style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <Icon name="phone" size={12} strokeWidth={2.4} /> {v.whatsapp}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.35rem" }}>
                    Owner: {v.profiles?.full_name ?? v.profiles?.username ?? "—"}
                    {v.owner_email ? ` · ${v.owner_email}` : ""}
                    {" · "}{new Date(v.created_at).toLocaleDateString("id-ID")}
                    {v.last_confirmed_at && (
                      <> · konfirmasi terakhir {new Date(v.last_confirmed_at).toLocaleDateString("id-ID")}</>
                    )}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {v.archived_at ? (
                    // Archived row: only show reactivate (+ KTM/View if relevant).
                    <Button size="sm" icon="refresh-cw" onClick={() => act(v.id, "reactivate")} disabled={actionId === v.id}>
                      Aktifkan
                    </Button>
                  ) : (
                    <>
                      {!v.is_verified && (
                        <>
                          <Button size="sm" icon="check" onClick={() => act(v.id, "approve")} disabled={actionId === v.id}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" icon="x" onClick={() => act(v.id, "reject")} disabled={actionId === v.id}>
                            Reject
                          </Button>
                        </>
                      )}
                      {v.is_verified && (
                        <Button size="sm" variant="ghost" icon="package" onClick={() => act(v.id, "archive")} disabled={actionId === v.id}>
                          Arsipkan
                        </Button>
                      )}
                    </>
                  )}
                  {v.ktm_url && (
                    <Button size="sm" variant="ghost" icon="file-text" onClick={() => void viewKtm(v.id)}>
                      Lihat KTM
                    </Button>
                  )}
                  <Button href={`/directory/vendor/${v.id}`} size="sm" variant="ghost" icon="eye">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
