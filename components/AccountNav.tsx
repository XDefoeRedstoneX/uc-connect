import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";

export type AccountNavId = "profile" | "favorites" | "reviews" | "threads";

const ITEMS: { href: string; label: string; id: AccountNavId; icon: IconName }[] = [
  { href: "/customer/profile",   label: "Profil",       id: "profile",   icon: "user" },
  { href: "/customer/favorites", label: "Favorit",      id: "favorites", icon: "heart" },
  { href: "/customer/reviews",   label: "Ulasan Saya",  id: "reviews",   icon: "star" },
  { href: "/customer/threads",   label: "Diskusi Saya", id: "threads",   icon: "chat" },
];

// Sub-nav shared across the customer account pages, mirroring AdminNav. Gives
// favorites / reviews / threads a consistent, discoverable home instead of
// being reachable only by URL.
export default function AccountNav({ current }: { current: AccountNavId }) {
  return (
    <div className="scroll-tabs" style={{ borderBottom: "2px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
      {ITEMS.map((n) => (
        <Link key={n.id} href={n.href}
          aria-current={n.id === current ? "page" : undefined}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: n.id === current ? "var(--gradient-main)" : "transparent",
            color: n.id === current ? "#fff" : "var(--muted)",
            border: "none", borderRadius: "8px", padding: "0.45rem 1rem",
            fontWeight: 700, fontSize: "0.88rem", textDecoration: "none", whiteSpace: "nowrap",
          }}>
          <Icon name={n.icon} size={15} strokeWidth={2.2} />
          {n.label}
        </Link>
      ))}
    </div>
  );
}
