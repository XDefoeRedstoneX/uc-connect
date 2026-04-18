import Link from "next/link";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { UserProfile } from "@/types/domain";

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase env is missing.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setError("Please login first.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Failed to load profile");
        setLoading(false);
        return;
      }

      setProfile(json.profile ?? null);
      setLoading(false);
    };

    void load();
  }, []);

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <SiteLayout title="Customer Profile | UC Connect">
      <section className="card">
        <h1>Customer Profile</h1>

        {loading && <p>Loading profile...</p>}
        {error && <p className="err">{error}</p>}

        {profile && (
          <div className="stack compact-top">
            <p>Name: {profile.full_name ?? "Not set"}</p>
            <p>Phone: {profile.phone ?? "Not set"}</p>
            <p>Role: {profile.role}</p>
            <Link className="btn" href="/customer/edit-profile">Edit profile</Link>
            <button type="button" className="secondary" onClick={logout}>Logout</button>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
