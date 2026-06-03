import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";

export type AdminNavId = "dash" | "vendors" | "users" | "reviews" | "forum" | "reports" | "featured";

const ITEMS: { href: string; label: string; id: AdminNavId; icon: IconName }[] = [
  { href: "/admin",          label: "Dashboard",          id: "dash",     icon: "grid" },
  { href: "/admin/vendors",  label: "Verifikasi Vendor",  id: "vendors",  icon: "store" },
  { href: "/admin/users",    label: "Users",              id: "users",    icon: "users" },
  { href: "/admin/reviews",  label: "Ulasan",             id: "reviews",  icon: "star" },
  { href: "/admin/forum",    label: "Forum",              id: "forum",    icon: "chat" },
  { href: "/admin/reports",  label: "Laporan",            id: "reports",  icon: "flag" },
  { href: "/admin/featured", label: "Featured",           id: "featured", icon: "trophy" },
];

export default function AdminNav({ current }: { current: AdminNavId }) {
  return (
    <div className="scroll-tabs" style={{ borderBottom: "2px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
      {ITEMS.map((n) => {
        const active = n.id === current;
        return (
          <Link key={n.id} href={n.href}
            aria-current={active ? "page" : undefined}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              background: active ? "var(--pacific)" : "transparent",
              color: active ? "#fff" : "var(--muted)",
              border: "none", borderRadius: "999px", padding: "0.45rem 1rem",
              fontWeight: 700, fontSize: "0.88rem", textDecoration: "none", whiteSpace: "nowrap",
            }}>
            <Icon name={n.icon} size={15} strokeWidth={2.3} />
            {n.label}
          </Link>
        );
      })}
    </div>
  );
}
