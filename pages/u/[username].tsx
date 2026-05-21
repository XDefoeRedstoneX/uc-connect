import { GetServerSideProps } from "next";
import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type PublicProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  major: string | null;
  graduation_year: number | null;
  role: "customer" | "vendor" | "admin";
};
type VendorLite = { id: string; name: string; category: string | null; city: string | null; hero_image_url: string | null; logo_url: string | null; is_verified: boolean } | null;
type ThreadLite = { id: string; title: string; created_at: string; category_id: string; forum_categories: { slug: string } | null };

type Props = {
  profile: PublicProfile | null;
  vendor: VendorLite;
  threads: ThreadLite[];
};

export default function PublicProfilePage({ profile, vendor, threads }: Props) {
  if (!profile) {
    return (
      <SiteLayout title="Profil tidak ditemukan | UC Connect">
        <section className="card" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h1>Profil tidak ditemukan</h1>
          <Link href="/community" style={{ color: "var(--pacific)" }}>Kembali ke Forum</Link>
        </section>
      </SiteLayout>
    );
  }

  const currentYear = new Date().getFullYear();
  const isAlumni = profile.graduation_year != null && profile.graduation_year <= currentYear;
  const displayName = profile.full_name ?? profile.username ?? "Pengguna";

  return (
    <SiteLayout title={`${displayName} | UC Connect`}>
      <section className="card" style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--gradient-main)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "1.5rem", overflow: "hidden", flexShrink: 0 }}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (displayName[0] ?? "?")}
          </div>
          <div>
            <h1 style={{ margin: "0 0 0.25rem" }}>{displayName}</h1>
            <div className="row-wrap" style={{ gap: "0.4rem" }}>
              {profile.username && <span className="muted" style={{ fontSize: "0.85rem" }}>@{profile.username}</span>}
              {profile.role === "vendor" && <span className="badge pacific">🏪 Vendor</span>}
              {isAlumni && <span className="badge gold">🎓 Alumni</span>}
            </div>
            {(profile.major || profile.graduation_year) && (
              <p className="muted" style={{ margin: "0.4rem 0 0", fontSize: "0.85rem" }}>
                {profile.major}{profile.major && profile.graduation_year ? " · " : ""}{profile.graduation_year ? `Angkatan/Lulus ${profile.graduation_year}` : ""}
              </p>
            )}
          </div>
        </div>

        {vendor && (
          <div style={{ marginTop: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>🏪 Tokonya</h2>
            <Link href={`/directory/vendor/${vendor.id}`} className="dash-card" style={{ display: "flex", gap: "0.75rem", alignItems: "center", textDecoration: "none", color: "inherit" }}>
              {vendor.logo_url
                ? <img src={vendor.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--gradient-subtle)" }} />}
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{vendor.name} {vendor.is_verified && <span className="badge success" style={{ fontSize: "0.68rem" }}>✓</span>}</p>
                <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>{vendor.category ?? "—"}{vendor.city ? ` · ${vendor.city}` : ""}</p>
              </div>
            </Link>
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>💬 Diskusi Terbaru</h2>
          {threads.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>Belum ada thread.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.4rem" }}>
              {threads.map((t) => (
                <Link key={t.id} href={`/community/${t.forum_categories?.slug ?? "_"}/${t.id}`}
                  style={{ textDecoration: "none", color: "inherit", padding: "0.6rem 0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{t.title}</p>
                  <span className="muted" style={{ fontSize: "0.72rem" }}>{new Date(t.created_at).toLocaleDateString("id-ID")}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const username = ctx.params?.username as string;
  const supabase = getSupabaseServerClient();
  if (!supabase || !username) return { props: { profile: null, vendor: null, threads: [] } };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,full_name,avatar_url,major,graduation_year,role")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return { props: { profile: null, vendor: null, threads: [] } };

  const [vendorRes, threadsRes] = await Promise.all([
    supabase.from("vendors").select("id,name,category,city,hero_image_url,logo_url,is_verified").eq("owner_id", profile.id).maybeSingle(),
    supabase.from("forum_threads").select("id,title,created_at,category_id,forum_categories:category_id(slug)").eq("author_id", profile.id).order("created_at", { ascending: false }).limit(10),
  ]);

  return {
    props: {
      profile: profile as PublicProfile,
      vendor: (vendorRes.data as VendorLite) ?? null,
      threads: (threadsRes.data as unknown as ThreadLite[]) ?? [],
    },
  };
};
