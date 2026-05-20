import { useRef, useState } from "react";
import type { VendorProfile } from "@/pages/vendor/dashboard";
import { compressBanner, compressAndResize } from "@/lib/compress-image";
import { useToast } from "@/components/ToastProvider";

const CATEGORIES = ["Makanan & Minuman","Jasa & Layanan","Fashion","Kreatif & Desain","Elektronik","Kesehatan & Kecantikan","Lainnya"];
const SALES_SYSTEMS = [
  { value: "ready-stock", label: "Ready Stock" },
  { value: "pre-order", label: "Pre-Order" },
  { value: "lainnya", label: "Lainnya" },
];
const DELIVERY_OPTIONS = ["COD Kampus", "Digital Delivery"];

type Props = {
  vendor: VendorProfile;
  token: string;
  onSaved: (v: VendorProfile) => void;
};

async function uploadImage(supabaseUrl: string, token: string, bucket: string, path: string, file: File): Promise<string> {
  // Use the user's session token — Supabase Storage RLS rejects the anon key.
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type, "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload gagal: ${await res.text()}`);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

// Split a stored "COD Kampus, Digital Delivery, Sesuatu" string into known
// checkbox selections + a free-text remainder.
function parseDelivery(raw: string | null): { selected: string[]; other: string } {
  const parts = (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const selected = parts.filter((p) => DELIVERY_OPTIONS.includes(p));
  const other = parts.filter((p) => !DELIVERY_OPTIONS.includes(p)).join(", ");
  return { selected, other };
}

export default function TabEditProfile({ vendor, token, onSaved }: Props) {
  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const initialDelivery = parseDelivery(vendor.delivery_methods ?? null);

  const [form, setForm] = useState({
    name: vendor.name,
    tagline: vendor.tagline ?? "",
    category: vendor.category ?? "",
    city: vendor.city ?? "",
    address: vendor.address ?? "",
    description: vendor.description ?? "",
    whatsapp: vendor.whatsapp ?? "",
    website_url: vendor.website_url ?? "",
    university: vendor.university ?? "",
    sales_system: vendor.sales_system ?? "",
  });
  const [deliverySelected, setDeliverySelected] = useState<string[]>(initialDelivery.selected);
  const [deliveryOther, setDeliveryOther] = useState(initialDelivery.other);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(vendor.hero_image_url);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(vendor.logo_url);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function toggleDelivery(option: string) {
    setDeliverySelected(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
  }

  async function handleBanner(file: File | null) {
    if (!file) return;
    const compressed = await compressBanner(file);
    setBannerFile(compressed);
    setBannerPreview(URL.createObjectURL(compressed));
  }

  async function handleLogo(file: File | null) {
    if (!file) return;
    const compressed = await compressAndResize(file, 400, 400, 150);
    setLogoFile(compressed);
    setLogoPreview(URL.createObjectURL(compressed));
  }

  async function save() {
    setSaving(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      let hero_image_url = vendor.hero_image_url;
      let logo_url = vendor.logo_url;

      if (bannerFile) {
        hero_image_url = await uploadImage(supabaseUrl, token, "vendor-assets", `vendor-banners/${vendor.id}/banner-${Date.now()}.jpg`, bannerFile);
      }
      if (logoFile) {
        logo_url = await uploadImage(supabaseUrl, token, "vendor-assets", `vendor-logos/${vendor.id}/logo-${Date.now()}.jpg`, logoFile);
      }

      const delivery_methods = [...deliverySelected, ...(deliveryOther.trim() ? [deliveryOther.trim()] : [])].join(", ");

      const res = await fetch("/api/vendor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, delivery_methods, hero_image_url, logo_url }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error ?? "Gagal menyimpan.", "error"); return; }
      onSaved(json.vendor);
      showToast("Profil berhasil disimpan!");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Terjadi kesalahan", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr min(340px, 40%)", gap: "1.25rem", alignItems: "start" }}>
      {/* Form */}
      <div className="dash-card">
        <h2 style={{ marginTop: 0 }}>Edit Profil Bisnis</h2>

        {/* Logo + Banner upload */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)", display: "block", marginBottom: "0.5rem" }}>Logo</label>
            <div className="dropzone" onClick={() => logoRef.current?.click()}
              style={{ width: "90px", height: "90px", borderRadius: "50%", backgroundImage: logoPreview ? `url(${logoPreview})` : undefined, backgroundSize: "cover", backgroundPosition: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!logoPreview && <span style={{ color: "var(--muted)", fontSize: "0.7rem", textAlign: "center" }}>Klik</span>}
              <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => handleLogo(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)", display: "block", marginBottom: "0.5rem" }}>
              Banner (1200×400, maks 300 KB)
            </label>
            <div className="dropzone" onClick={() => bannerRef.current?.click()}
              style={{ height: "90px", backgroundImage: bannerPreview ? `url(${bannerPreview})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
              {!bannerPreview && <span style={{ color: "var(--muted)" }}>Klik untuk upload banner</span>}
              <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => handleBanner(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="stack" style={{ gap: "0.75rem" }}>
          {[
            { id: "name", label: "Nama Bisnis *", type: "text", placeholder: "Nama usaha Anda" },
            { id: "tagline", label: "Tagline", type: "text", placeholder: "Slogan singkat" },
            { id: "city", label: "Lokasi", type: "text", placeholder: "Jakarta, Surabaya, ..." },
            { id: "address", label: "Detail Lokasi / Alamat", type: "text", placeholder: "Gedung, area, atau kampus" },
            { id: "whatsapp", label: "WhatsApp *", type: "tel", placeholder: "0812..." },
            { id: "website_url", label: "Website", type: "url", placeholder: "https://..." },
          ].map(f => (
            <label key={f.id}>
              <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>{f.label}</span>
              <input type={f.type} value={(form as Record<string,string>)[f.id]}
                onChange={e => set(f.id, e.target.value)} placeholder={f.placeholder} style={{ marginTop: "0.35rem" }} />
            </label>
          ))}

          <label>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Kategori</span>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={{ marginTop: "0.35rem" }}>
              <option value="">Pilih kategori...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Deskripsi</span>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={4} placeholder="Ceritakan tentang bisnis Anda..." style={{ marginTop: "0.35rem", width: "100%" }} />
          </label>

          <label>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Universitas</span>
            <input type="text" value={form.university}
              onChange={e => set("university", e.target.value)} placeholder="Universitas Ciputra" style={{ marginTop: "0.35rem" }} />
          </label>

          <label>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Sistem Penjualan</span>
            <select value={form.sales_system} onChange={e => set("sales_system", e.target.value)} style={{ marginTop: "0.35rem" }}>
              <option value="">Pilih...</option>
              {SALES_SYSTEMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>

          <div>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Metode Pengiriman</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.4rem" }}>
              {DELIVERY_OPTIONS.map(opt => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={deliverySelected.includes(opt)} onChange={() => toggleDelivery(opt)} />
                  {opt}
                </label>
              ))}
            </div>
            <input type="text" value={deliveryOther} onChange={e => setDeliveryOther(e.target.value)}
              placeholder="Lainnya (pisahkan dengan koma)" style={{ marginTop: "0.5rem" }} />
          </div>
        </div>

        <button onClick={save} disabled={saving} style={{ marginTop: "1rem", width: "100%" }}>
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      {/* Live Preview */}
      <div className="dash-card" style={{ position: "sticky", top: "5rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "0.95rem", color: "var(--muted)" }}>👁 Preview Profil</h2>
        {bannerPreview && (
          <img src={bannerPreview} alt="Banner preview"
            style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: "0.75rem" }} />
        )}
        {!bannerPreview && (
          <div style={{ width: "100%", height: "80px", background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)", marginBottom: "0.75rem" }} />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
          {logoPreview && <img src={logoPreview} alt="Logo" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
          <h3 style={{ margin: 0, fontWeight: 800 }}>{form.name || "Nama Bisnis"}</h3>
        </div>
        {form.tagline && <p style={{ color: "var(--muted)", margin: "0 0 0.5rem", fontSize: "0.88rem" }}>{form.tagline}</p>}
        <div className="row-wrap" style={{ gap: "0.35rem", marginBottom: "0.5rem" }}>
          {form.category && <span className="badge pacific">{form.category}</span>}
          {form.city && <span className="badge pacific">📍 {form.city}</span>}
        </div>
        {form.address && <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0 0 0.5rem" }}>📍 {form.address}</p>}
        {form.description && <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5 }}>{form.description.slice(0, 120)}{form.description.length > 120 ? "..." : ""}</p>}
        {form.whatsapp && (
          <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "#e7fce9", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, color: "#1a6b2e" }}>
            📱 {form.whatsapp}
          </div>
        )}
      </div>
    </div>
  );
}
