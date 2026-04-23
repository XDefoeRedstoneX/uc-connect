import { FormEvent, useEffect, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function EditProfilePage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function normalizeIndonesianPhoneToLocal(phoneRaw: string): { phone: string | null; error: string | null } {
    const trimmed = phoneRaw.trim();
    if (!trimmed) return { phone: null, error: null };

    let cleaned = trimmed.replace(/[\s\-()]/g, "");
    cleaned = cleaned.replace(/[^0-9+]/g, "");

    if (cleaned.startsWith("+")) {
      if (!cleaned.startsWith("+62")) {
        return { phone: null, error: "Phone must start with +62 for international format." };
      }
      cleaned = `0${cleaned.slice(3)}`;
    } else if (cleaned.startsWith("62")) {
      cleaned = `0${cleaned.slice(2)}`;
    } else if (cleaned.startsWith("8")) {
      cleaned = `0${cleaned}`;
    } else if (!cleaned.startsWith("0")) {
      return { phone: null, error: "Use format 08…, 8…, +62…, or 62…." };
    }

    if (!/^\d+$/.test(cleaned)) {
      return { phone: null, error: "Phone must contain digits only." };
    }

    if (cleaned.length < 10 || cleaned.length > 13) {
      return { phone: null, error: "Phone number length looks invalid." };
    }

    return { phone: cleaned, error: null };
  }

  const phonePreview = normalizeIndonesianPhoneToLocal(phone);
  const phoneInternational = phonePreview.phone ? `+62${phonePreview.phone.slice(1)}` : null;

  useEffect(() => {
    const load = async () => {
      setError(null);
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError("Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Sesi tidak ditemukan. Silakan masuk kembali.");
        return;
      }

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(toPublicPageErrorMessage(data.error));
        return;
      }

      setFullName(data.profile?.full_name ?? "");
      setPhone(data.profile?.phone ?? "");
    };

    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedPhone = normalizeIndonesianPhoneToLocal(phone);
    if (normalizedPhone.error) {
      setError(normalizedPhone.error);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Sesi tidak ditemukan. Silakan masuk kembali.");
      return;
    }

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ full_name: fullName, phone: normalizedPhone.phone ?? "" }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(toPublicPageErrorMessage(data.error));
      return;
    }

    setMessage("Profil berhasil diperbarui.");
  }

  return (
    <SiteLayout title="Edit Profile | UC Connect">
      <section className="card">
        <h1>Edit Profile</h1>
        <form onSubmit={onSubmit} className="stack">
          <label>
            Full name
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="0812… / +62812…" />
          </label>
          {phone && phonePreview.error && <p className="err">{phonePreview.error}</p>}
          {phoneInternational && !phonePreview.error && <p>International format: {phoneInternational}</p>}
          <button type="submit">Save profile</button>
        </form>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
