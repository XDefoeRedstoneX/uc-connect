import { useRef, useState } from "react";
import type { VendorProfile } from "@/pages/vendor/dashboard";
import { compressBanner } from "@/lib/compress-image";
import { useToast } from "@/components/ToastProvider";

const CATEGORIES = ["Makanan & Minuman","Jasa & Layanan","Fashion","Kreatif & Desain","Elektronik","Kesehatan & Kecantikan","Lainnya"];

type Props = {
  vendor: VendorProfile;
  token: string;
  onSaved: (v: VendorProfile) => void;
};

async function uploadImage(supabaseUrl: string, anonKey: string, bucket: string, path: string, file: File): Promise<string> {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${anonKey}`, "Content-Type": file.type, "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export default function TabEditProfile({ vendor, token, onSaved }: Props) {
  const bannerRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: vendor.name,
    tagline: vendor.tagline ?? "",
    category: vendor.category ?? "",
    city: vendor.city ?? "",
    description: vendor.description ?? "",
    whatsapp: vendor.whatsapp ?? "",
    website_url: vendor.website_url ?? "",
    university: (vendor as any).university ?? "",
    sales_system: (vendor as any).sales_system ?? "",
    delivery_methods: (vendor as any).delivery_methods ?? "",
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(vendor.hero_image_url);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleBanner(file: File | null) {
    if (!file) return;
    const compressed = await compressBanner(file);
    setBannerFile(compressed);
    setBannerPreview(URL.createObjectURL(compressed));
  }

  async function save() {
    setSaving(true);
    try {
      let hero_image_url = vendor.hero_image_url;

      if (bannerFile) {
        // Upload via Supabase storage REST — use env vars exposed to browser
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
        const path = `vendor-banners/${vendor.id}/banner.jpg`;
        hero_image_url = await uploadImage(supabaseUrl, anonKey, "vendor-assets", path, bannerFile);
      }

      const res = await fetch("/api/vendor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, hero_image_url }),
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

        {/* Banner upload */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)", display: "block", marginBottom: "0.5rem" }}>
            Banner (1200×400, maks 300 KB)
          </label>
          <div className="dropzone" onClick={() => bannerRef.current?.click()}
            style={{ height: "120px", backgroundImage: bannerPreview ? `url(${bannerPreview})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
            {!bannerPreview && <span style={{ color: "var(--muted)" }}>Klik untuk upload banner</span>}
            <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => handleBanner(e.target.files?.[0] ?? null)} />
          </div>
          {bannerPreview && (
            <button type="button" onClick={() => { setBannerFile(null); setBannerPreview(null); }}
              style={{ marginTop: "0.5rem", background: "var(--error)", fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}>
              Hapus Banner
            </button>
          )}
        </div>

        {/* Fields */}
        <div className="stack" style={{ gap: "0.75rem" }}>
          {[
            { id: "name", label: "Nama Bisnis *", type: "text", placeholder: "Nama usaha Anda" },
            { id: "tagline", label: "Tagline", type: "text", placeholder: "Slogan singkat" },
            { id: "city", label: "Kota", type: "text", placeholder: "Jakarta, Surabaya, ..." },
            { id: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "0812..." },
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

          {/* Onboarding fields */}
          <label>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Universitas</span>
            <input type="text" value={form.university}
              onChange={e => set("university", e.target.value)} placeholder="Universitas Ciputra" style={{ marginTop: "0.35rem" }} />
          </label>

          <label>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Sistem Penjualan</span>
            <select value={form.sales_system} onChange={e => set("sales_system", e.target.value)} style={{ marginTop: "0.35rem" }}>
              <option value="">Pilih...</option>
              <option value="ready-stock">Ready Stock</option>
              <option value="pre-order">Pre-Order</option>
            </select>
          </label>

          <label>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" }}>Metode Pengiriman</span>
            <input type="text" value={form.delivery_methods}
              onChange={e => set("delivery_methods", e.target.value)} placeholder="COD Kampus, Digital Delivery" style={{ marginTop: "0.35rem" }} />
          </label>
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
        <h3 style={{ margin: "0 0 0.2rem", fontWeight: 800 }}>{form.name || "Nama Bisnis"}</h3>
        {form.tagline && <p style={{ color: "var(--muted)", margin: "0 0 0.5rem", fontSize: "0.88rem" }}>{form.tagline}</p>}
        <div className="row-wrap" style={{ gap: "0.35rem", marginBottom: "0.5rem" }}>
          {form.category && <span className="badge pacific">{form.category}</span>}
          {form.city && <span className="badge pacific">📍 {form.city}</span>}
        </div>
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
