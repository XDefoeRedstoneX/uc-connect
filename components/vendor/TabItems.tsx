import { useRef, useState } from "react";
import type { VendorProfile, VendorItem } from "@/pages/vendor/dashboard";
import { useToast } from "@/components/ToastProvider";
import { compressAndResize } from "@/lib/compress-image";

type Props = {
  items: VendorItem[];
  vendor: VendorProfile;
  token: string;
  onItemsChange: (items: VendorItem[]) => void;
};

type ItemForm = { name: string; description: string; price: string; currency: string; };

const EMPTY_FORM: ItemForm = { name: "", description: "", price: "0", currency: "IDR" };

function inferType(category: string | null): "menu" | "service" | "product" {
  const c = (category ?? "").toLowerCase();
  if (c.includes("makan") || c.includes("food") || c.includes("kuliner") || c.includes("minuman")) return "menu";
  if (c.includes("jasa") || c.includes("service") || c.includes("layanan")) return "service";
  return "product";
}

const TYPE_LABELS: Record<string, string> = { menu: "Menu / Makanan", service: "Layanan / Jasa", product: "Produk" };

async function uploadItemImage(token: string, vendorId: string, itemId: string, file: File): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `vendor-items/${vendorId}/${itemId}-${Date.now()}.${ext}`;
  // Use the user's session token — Supabase Storage RLS rejects the anon key.
  const res = await fetch(`${supabaseUrl}/storage/v1/object/vendor-assets/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type, "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload gagal: ${await res.text()}`);
  return `${supabaseUrl}/storage/v1/object/public/vendor-assets/${path}`;
}

export default function TabItems({ items, vendor, token, onItemsChange }: Props) {
  const itemType = inferType(vendor.category);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const imageRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof ItemForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  function startAdd() {
    setForm(EMPTY_FORM); setEditId(null); setShowForm(true);
    setImageFile(null); setImagePreview(null);
  }
  function startEdit(item: VendorItem) {
    setForm({ name: item.name, description: item.description ?? "", price: String(item.price), currency: item.currency });
    setEditId(item.id); setShowForm(true);
    setImageFile(null); setImagePreview(item.image_url);
  }

  async function handleImage(file: File | null) {
    if (!file) return;
    const compressed = await compressAndResize(file, 800, 800, 300);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  }

  async function save() {
    setSaving(true);
    const body: Record<string, unknown> = { ...form, price: parseFloat(form.price) || 0, item_type: itemType };

    const url = editId ? `/api/vendor/items/${editId}` : "/api/vendor/items";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) { showToast(json.error ?? "Gagal menyimpan.", "error"); setSaving(false); return; }

    const savedItem = json.item as VendorItem;

    // Upload image if provided
    if (imageFile) {
      try {
        const imageUrl = await uploadItemImage(token, vendor.id, savedItem.id, imageFile);
        // Update item with image URL
        await fetch(`/api/vendor/items/${savedItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image_url: imageUrl }),
        });
        savedItem.image_url = imageUrl;
      } catch {
        showToast("Gambar gagal diupload, item tetap tersimpan.", "error");
      }
    }

    if (editId) {
      onItemsChange(items.map(i => i.id === editId ? savedItem : i));
    } else {
      onItemsChange([savedItem, ...items]);
    }
    showToast(editId ? "Item berhasil diperbarui!" : "Item berhasil ditambahkan!");
    setShowForm(false); setEditId(null); setSaving(false);
    setImageFile(null); setImagePreview(null);
  }

  async function toggleActive(item: VendorItem) {
    const res = await fetch(`/api/vendor/items/${item.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    if (res.ok) { const j = await res.json(); onItemsChange(items.map(i => i.id === item.id ? j.item : i)); }
  }

  async function remove(id: string) {
    if (!confirm("Hapus item ini?")) return;
    const res = await fetch(`/api/vendor/items/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { onItemsChange(items.filter(i => i.id !== id)); showToast("Item dihapus."); }
  }

  return (
    <div className="dash-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>{TYPE_LABELS[itemType]} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.9rem" }}>({items.length} item)</span></h2>
        <button onClick={startAdd}>+ Tambah {TYPE_LABELS[itemType]}</button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div style={{ background: "var(--pacific-soft)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1.25rem", border: "1px solid rgba(28,169,201,0.2)" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>{editId ? "Edit Item" : `Tambah ${TYPE_LABELS[itemType]}`}</h3>
          <div className="stack" style={{ gap: "0.65rem" }}>
            <label>
              <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Nama *</span>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nama item" style={{ marginTop: "0.3rem" }} />
            </label>
            <label>
              <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Deskripsi</span>
              <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Deskripsi singkat..." style={{ marginTop: "0.3rem", width: "100%" }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem" }}>
              <label>
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Harga (IDR)</span>
                <input type="number" min="0" value={form.price} onChange={e => set("price", e.target.value)} style={{ marginTop: "0.3rem" }} />
              </label>
            </div>

            {/* Image upload */}
            <label>
              <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Gambar Produk</span>
              <div className="dropzone" onClick={() => imageRef.current?.click()}
                style={{ marginTop: "0.3rem", height: "80px", backgroundImage: imagePreview ? `url(${imagePreview})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
                {!imagePreview && <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>📷 Klik untuk upload gambar</span>}
                <input ref={imageRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => handleImage(e.target.files?.[0] ?? null)} />
              </div>
            </label>
            {imagePreview && (
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                style={{ background: "var(--error)", fontSize: "0.8rem", padding: "0.3rem 0.8rem", alignSelf: "flex-start" }}>
                Hapus Gambar
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
            <button className="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>Batal</button>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</p>
          <p style={{ color: "var(--muted)" }}>Belum ada item. Tambah {TYPE_LABELS[itemType].toLowerCase()} pertama Anda!</p>
        </div>
      ) : (
        <div>
          {items.map(item => (
            <div key={item.id} className="product-row">
              {item.image_url && (
                <img src={item.image_url} alt={item.name}
                  style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <p className="product-name">{item.name}</p>
                {item.description && <p className="product-price">{item.description}</p>}
                <p style={{ color: "var(--orange)", fontWeight: 700, fontSize: "0.9rem" }}>
                  Rp {item.price.toLocaleString("id-ID")}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button type="button" onClick={() => toggleActive(item)} className="ghost"
                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}>
                  {item.is_active ? "🟢 Aktif" : "⚪ Nonaktif"}
                </button>
                <button type="button" onClick={() => startEdit(item)} className="secondary"
                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}>✏️</button>
                <button type="button" onClick={() => remove(item.id)}
                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem", background: "var(--error)" }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
