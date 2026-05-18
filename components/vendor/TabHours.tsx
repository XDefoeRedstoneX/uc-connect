import { useState } from "react";
import type { VendorHour } from "@/pages/vendor/dashboard";
import { useToast } from "@/components/ToastProvider";

const DAYS = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

type Props = { hours: VendorHour[]; token: string; onSaved: (h: VendorHour[]) => void; };

export default function TabHours({ hours, token, onSaved }: Props) {
  const [local, setLocal] = useState<VendorHour[]>(hours);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  function update(dayIndex: number, field: keyof VendorHour, value: unknown) {
    setLocal(prev => prev.map(h => h.day_of_week === dayIndex ? { ...h, [field]: value } : h));
  }

  // Apply same time to all open days
  function applyToAll(baseDay: number) {
    const base = local.find(h => h.day_of_week === baseDay);
    if (!base) return;
    setLocal(prev => prev.map(h => h.is_closed ? h : { ...h, opens_at: base.opens_at, closes_at: base.closes_at }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/vendor/hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ hours: local }),
    });
    const json = await res.json();
    if (!res.ok) { showToast(json.error ?? "Gagal menyimpan.", "error"); setSaving(false); return; }
    onSaved(json.hours ?? local);
    showToast("Jam operasional berhasil disimpan!");
    setSaving(false);
  }

  return (
    <div className="dash-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>Jam Operasional</h2>
        <button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "1rem" }}>
        Atur hari dan jam buka toko Anda. Klik "Terapkan ke Semua" untuk menyalin jam ke hari yang buka.
      </p>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {local.map((h) => (
          <div key={h.day_of_week} style={{
            display: "grid", gridTemplateColumns: "80px auto 1fr 1fr auto", gap: "0.75rem",
            alignItems: "center", padding: "0.75rem", borderRadius: "var(--radius-md)",
            background: h.is_closed ? "var(--bg)" : "var(--pacific-soft)",
            border: `1px solid ${h.is_closed ? "var(--border)" : "rgba(28,169,201,0.2)"}`,
            opacity: h.is_closed ? 0.7 : 1,
          }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{DAYS[h.day_of_week]}</span>

            {/* Open/closed toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={!h.is_closed}
                onChange={e => update(h.day_of_week, "is_closed", !e.target.checked)}
                style={{ width: "1.1rem", height: "1.1rem", accentColor: "var(--pacific)" }} />
              <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{h.is_closed ? "Tutup" : "Buka"}</span>
            </label>

            {/* Opens at */}
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Buka</span>
              <input type="time" value={h.opens_at ?? "08:00"} disabled={h.is_closed}
                onChange={e => update(h.day_of_week, "opens_at", e.target.value)}
                style={{ fontSize: "0.9rem", padding: "0.3rem 0.5rem" }} />
            </label>

            {/* Closes at */}
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Tutup</span>
              <input type="time" value={h.closes_at ?? "17:00"} disabled={h.is_closed}
                onChange={e => update(h.day_of_week, "closes_at", e.target.value)}
                style={{ fontSize: "0.9rem", padding: "0.3rem 0.5rem" }} />
            </label>

            {/* Apply to all */}
            {!h.is_closed && (
              <button type="button" className="ghost"
                onClick={() => applyToAll(h.day_of_week)}
                style={{ fontSize: "0.72rem", padding: "0.25rem 0.5rem", whiteSpace: "nowrap" }}>
                Terapkan ke Semua
              </button>
            )}
            {h.is_closed && <span />}
          </div>
        ))}
      </div>

    </div>
  );
}
