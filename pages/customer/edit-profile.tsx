import { FormEvent, useEffect, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function EditProfilePage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase env is missing.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Please login first.");
        return;
      }

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to load profile");
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

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase env is missing.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Please login first.");
      return;
    }

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ full_name: fullName, phone }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to save profile");
      return;
    }

    setMessage("Profile updated successfully.");
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
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <button type="submit">Save profile</button>
        </form>

        {message && <p className="ok">{message}</p>}
        {error && <p className="err">{error}</p>}
      </section>
    </SiteLayout>
  );
}
