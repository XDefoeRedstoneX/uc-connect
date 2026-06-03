import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import Icon from "@/components/ui/Icon";
import type { ReportTargetType } from "@/types/domain";

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  size?: "sm" | "md";
};

export default function ReportButton({ targetType, targetId, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setReason("");
    setDone(false);
    setError(null);
  };

  // Close the report dialog on Escape while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
      if (!token) {
        setError("Login dulu untuk melaporkan konten.");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason: reason.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Gagal mengirim laporan");
      } else {
        setDone(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--muted)",
          cursor: "pointer",
          fontSize: size === "sm" ? "0.78rem" : "0.88rem",
          padding: "0.1rem 0.35rem",
          display: "inline-flex", alignItems: "center", gap: "0.25rem",
        }}
        title="Laporkan konten ini"
      >
        <Icon name="flag" size={size === "sm" ? 13 : 15} strokeWidth={2.3} /> Laporkan
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "1rem",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Laporkan konten"
            onClick={(e) => e.stopPropagation()}
            className="dash-card"
            style={{ width: "100%", maxWidth: "440px", background: "#fff" }}
          >
            {done ? (
              <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                <p style={{ margin: "0 0 0.4rem", color: "#16a34a", display: "flex", justifyContent: "center" }}><Icon name="check-circle" size={32} strokeWidth={2.2} /></p>
                <p style={{ margin: 0, fontWeight: 700 }}>Laporan terkirim</p>
                <p className="muted" style={{ margin: "0.3rem 0 1rem", fontSize: "0.85rem" }}>
                  Tim admin akan meninjau dalam waktu dekat.
                </p>
                <button type="button" onClick={close}>Tutup</button>
              </div>
            ) : (
              <>
                <h3 style={{ margin: "0 0 0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Icon name="flag" size={18} strokeWidth={2.3} /> Laporkan Konten
                </h3>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  Beri tahu kami apa yang salah dengan {targetTypeLabel(targetType)} ini. Minimal 5 karakter.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Contoh: spam, kasar, menyesatkan, dll."
                  style={{ width: "100%", marginBottom: "0.75rem" }}
                />
                {error && <p className="err" style={{ marginBottom: "0.5rem" }}>{error}</p>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button type="button" className="ghost" onClick={close}>Batal</button>
                  <button
                    type="button"
                    disabled={submitting || reason.trim().length < 5}
                    onClick={() => void submit()}
                  >
                    {submitting ? "Mengirim…" : "Kirim Laporan"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function targetTypeLabel(t: ReportTargetType) {
  switch (t) {
    case "vendor": return "vendor";
    case "review": return "ulasan";
    case "thread": return "thread";
    case "reply": return "balasan";
  }
}
