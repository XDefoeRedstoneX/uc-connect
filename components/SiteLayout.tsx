import Head from "next/head";
import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/directory/home", label: "Directory" },
  { href: "/directory/explore", label: "Explore" },
  { href: "/customer/profile", label: "Profile" },
  { href: "/auth/login", label: "Login" },
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
          <div className="brand">UC Connect</div>
          <nav className="topnav">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="content">{children}</main>
        <footer className="footer">
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </footer>
      </div>
    </>
  );
}
