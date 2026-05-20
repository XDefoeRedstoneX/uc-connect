import Link from "next/link";

export type AdminNavId = "dash" | "vendors" | "users" | "reviews" | "forum" | "reports" | "featured";

const ITEMS: { href: string; label: string; id: AdminNavId }[] = [
  { href: "/admin",          label: "📊 Dashboard",        id: "dash" },
  { href: "/admin/vendors",  label: "🏪 Verifikasi Vendor", id: "vendors" },
  { href: "/admin/users",    label: "👥 Users",            id: "users" },
  { href: "/admin/reviews",  label: "⭐ Ulasan",            id: "reviews" },
  { href: "/admin/forum",    label: "💬 Forum",            id: "forum" },
  { href: "/admin/reports",  label: "🚩 Laporan",          id: "reports" },
  { href: "/admin/featured", label: "🏆 Featured",         id: "featured" },
];

export default function AdminNav({ current }: { current: AdminNavId }) {
  return (
    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", borderBottom: "2px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
      {ITEMS.map((n) => (
        <Link key={n.id} href={n.href}
          style={{
            background: n.id === current ? "var(--gradient-main)" : "transparent",
            color: n.id === current ? "#fff" : "var(--muted)",
            border: "none", borderRadius: "8px", padding: "0.45rem 1rem",
            fontWeight: 700, fontSize: "0.88rem", textDecoration: "none",
          }}>
          {n.label}
        </Link>
      ))}
    </div>
  );
}
