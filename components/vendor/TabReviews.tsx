import { useEffect, useState } from "react";
import type { VendorReview } from "@/types/domain";
import { useToast } from "@/components/ToastProvider";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Stat from "@/components/ui/Stat";
import EmptyState from "@/components/ui/EmptyState";

type Props = {
  vendorId: string;
  token: string;
};

export default function TabReviews({ vendorId, token }: Props) {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`/api/vendor/${vendorId}/reviews`);
        if (!r.ok) throw new Error("Gagal memuat ulasan");
        const j = await r.json();
        setReviews(j.reviews ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat ulasan");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [vendorId]);

  const startReply = (review: VendorReview) => {
    setEditing(review.id);
    setDraft(review.vendor_reply ?? "");
  };

  const cancelReply = () => {
    setEditing(null);
    setDraft("");
  };

  const saveReply = async (reviewId: string) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/vendor/${vendorId}/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vendor_reply: draft.trim() || null }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal menyimpan balasan");
      }
      const j = await r.json();
      setReviews((prev) => prev.map((rv) => (rv.id === reviewId ? { ...rv, ...j.review } : rv)));
      cancelReply();
      showToast("Balasan tersimpan.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan balasan", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="dash-card"><p className="muted">Memuat ulasan…</p></div>;
  if (error) return <div className="dash-card"><p className="err">{error}</p></div>;

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon="star"
        title="Belum ada ulasan"
        description="Ulasan dari pelanggan akan tampil di sini. Bagikan tokomu agar pelanggan mulai memberi ulasan."
      />
    );
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <div className="dash-card" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ minWidth: "140px" }}>
          <Stat tone="warm" icon="star" value={avg.toFixed(1)} label={`Rata-rata · ${reviews.length} ulasan`} />
        </div>
        <div style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "0.85rem" }}>
          Balas ulasan untuk membangun reputasi tokomu.
        </div>
      </div>

      {reviews.map((rv) => {
        const isEditing = editing === rv.id;
        return (
          <div key={rv.id} className="dash-card" style={{ display: "grid", gap: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>{rv.profiles?.full_name ?? "Pelanggan"}</strong>
                <span style={{ display: "inline-flex", gap: "0.05rem", marginLeft: "0.5rem", verticalAlign: "middle" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Icon key={s} name="star" size={14} filled={s <= rv.rating}
                      style={{ color: s <= rv.rating ? "#f59e0b" : "#d1d5db" }} />
                  ))}
                </span>
              </div>
              <span className="muted" style={{ fontSize: "0.78rem" }}>
                {new Date(rv.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>

            {rv.content && <p style={{ margin: 0, color: "var(--text)", lineHeight: 1.5 }}>{rv.content}</p>}

            {!isEditing && rv.vendor_reply && (
              <div style={{ borderLeft: "3px solid var(--pacific)", padding: "0.5rem 0.75rem", background: "var(--gradient-subtle)", borderRadius: "0 8px 8px 0" }}>
                <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "var(--pacific)" }}>BALASAN VENDOR</p>
                <p style={{ margin: "0.25rem 0 0", color: "var(--text)", lineHeight: 1.5 }}>{rv.vendor_reply}</p>
              </div>
            )}

            {isEditing ? (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Tulis balasanmu…"
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <Button icon="check" disabled={saving} onClick={() => saveReply(rv.id)}>
                    {saving ? "Menyimpan…" : rv.vendor_reply ? "Perbarui Balasan" : "Kirim Balasan"}
                  </Button>
                  {rv.vendor_reply && (
                    <Button variant="ghost" icon="trash" disabled={saving} onClick={() => { setDraft(""); void saveReply(rv.id); }}>
                      Hapus Balasan
                    </Button>
                  )}
                  <Button variant="ghost" disabled={saving} onClick={cancelReply}>Batal</Button>
                </div>
              </div>
            ) : (
              <div>
                <Button variant="ghost" size="sm" icon={rv.vendor_reply ? "edit" : "message-circle"} onClick={() => startReply(rv)}>
                  {rv.vendor_reply ? "Edit Balasan" : "Balas Ulasan"}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
