import type { VendorProfile, VendorHour, VendorItem } from "@/pages/vendor/dashboard";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type Props = {
  vendor: VendorProfile;
  items: VendorItem[];
  hours: VendorHour[];
  setActiveTab: (tab: string) => void;
};

export default function TabOverview({ vendor, items, hours, setActiveTab }: Props) {
  const activeItems = items.filter(i => i.is_active).length;
  const todayHour = hours.find(h => h.day_of_week === new Date().getDay());
  const isOpenToday = todayHour && !todayHour.is_closed;

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      {/* Vendor header */}
      <div className="dash-card bubble-section">
        <div style={{ position: "relative", zIndex: 1 }}>
          {vendor.hero_image_url && (
            <img src={vendor.hero_image_url} alt="Banner"
              style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: "1rem" }} />
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 900, margin: "0 0 0.25rem" }}>{vendor.name}</h1>
              {vendor.tagline && <p style={{ color: "var(--muted)", margin: "0 0 0.5rem" }}>{vendor.tagline}</p>}
              <div className="row-wrap" style={{ gap: "0.4rem" }}>
                {vendor.is_verified
                  ? <span className="badge success">✓ Terverifikasi</span>
                  : <span className="badge" style={{ background: "var(--orange-soft)", color: "var(--orange-dark)" }}>⏳ Menunggu Verifikasi</span>}
                {vendor.category && <span className="badge pacific">{vendor.category}</span>}
                {vendor.city && <span className="badge pacific">📍 {vendor.city}</span>}
              </div>
            </div>
            <button onClick={() => setActiveTab("profile")} className="btn">✏️ Edit Profil</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
        <div className="dash-stat">
          <p className="dash-stat-value">{vendor.whatsapp_clicks}</p>
          <p className="dash-stat-label">Klik WhatsApp</p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat-value">{items.length}</p>
          <p className="dash-stat-label">Total Item</p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat-value">{activeItems}</p>
          <p className="dash-stat-label">Item Aktif</p>
        </div>
        <div className="dash-stat">
          <p className="dash-stat-value" style={{ fontSize: "1.1rem" }}>{isOpenToday ? "🟢 Buka" : "🔴 Tutup"}</p>
          <p className="dash-stat-label">Hari Ini ({DAYS[new Date().getDay()]})</p>
          {isOpenToday && todayHour.opens_at && (
            <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{todayHour.opens_at.slice(0,5)}–{todayHour.closes_at?.slice(0,5)}</p>
          )}
        </div>
      </div>

      {/* WhatsApp insight */}
      {vendor.whatsapp && (
        <div className="dash-card" style={{ background: "var(--gradient-subtle)", border: "1px solid rgba(28,169,201,0.1)" }}>
          <p style={{ fontWeight: 700, marginBottom: "0.35rem" }}>📱 WhatsApp Insights</p>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            <strong style={{ color: "var(--orange)", fontSize: "1.25rem" }}>{vendor.whatsapp_clicks}</strong> orang telah menekan tombol WhatsApp menuju bisnis Anda.
          </p>
          <a href={`https://wa.me/${vendor.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
            className="btn" style={{ background: "#25D366", fontSize: "0.85rem" }}>
            Buka WhatsApp
          </a>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
        {[
          { icon: "✏️", label: "Edit Profil", tab: "profile" },
          { icon: "📦", label: "Kelola Item", tab: "items" },
          { icon: "🕐", label: "Jam Buka", tab: "hours" },
        ].map(a => (
          <button key={a.tab} type="button" className="action-card" onClick={() => setActiveTab(a.tab)}>
            <p className="action-icon">{a.icon}</p>
            <p className="action-label">{a.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
