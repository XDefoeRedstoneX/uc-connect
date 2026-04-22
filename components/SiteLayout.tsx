import Head from "next/head";
import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

const navItems = [
  { href: "/", label: "Beranda / Home" },
  { href: "/directory/home", label: "Direktori / Directory" },
  { href: "/directory/explore", label: "Eksplorasi / Explore" },
  { href: "/customer/profile", label: "Profil / Profile" },
  { href: "/auth/login", label: "Masuk / Login" },
];

export default function SiteLayout({ title, children }: Props) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="site-shell">
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand" aria-label="UC Connect homepage">
              <img src="/logo-icon.svg" alt="UC Connect icon" className="brand-mark" />
              <span className="brand-text">
                <span className="brand-title">UC Connect</span>
                <span className="brand-sub">University Community Marketplace</span>
              </span>
            </Link>

            <nav className="topnav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="footer">
          <div className="footer-inner">
            <p className="footer-note">UC Connect • Kampus x Mahasiswa x UMKM</p>
            <div className="footer-links">
              <Link href="/legal/privacy">Privacy</Link>
              <Link href="/legal/terms">Terms</Link>
              <Link href="/support">Support</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
