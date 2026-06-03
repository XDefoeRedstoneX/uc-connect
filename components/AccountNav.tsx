import Link from "next/link";

export type AccountNavId = "profile" | "favorites" | "reviews" | "threads";

const ITEMS: { href: string; label: string; id: AccountNavId }[] = [
  { href: "/customer/profile",   label: "👤 Profil",      id: "profile" },
  { href: "/customer/favorites", label: "❤️ Favorit",     id: "favorites" },
  { href: "/customer/reviews",   label: "⭐ Ulasan Saya", id: "reviews" },
  { href: "/customer/threads",   label: "💬 Diskusi Saya", id: "threads" },
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
            background: n.id === current ? "var(--gradient-main)" : "transparent",
            color: n.id === current ? "#fff" : "var(--muted)",
            border: "none", borderRadius: "8px", padding: "0.45rem 1rem",
            fontWeight: 700, fontSize: "0.88rem", textDecoration: "none", whiteSpace: "nowrap",
          }}>
          {n.label}
        </Link>
      ))}
    </div>
  );
}
