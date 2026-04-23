import Head from "next/head";
import Link from "next/link";
import { ReactNode } from "react";
import { useLanguage } from "@/lib/language-context";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type Props = {
  title: string;
  children: ReactNode;
};

function SiteLayoutContent({ title, children }: Props) {
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/directory/home", label: t("nav.directory") },
    { href: "/directory/explore", label: t("nav.explore") },
    { href: "/customer/profile", label: t("nav.profile") },
    { href: "/auth/login", label: t("nav.login") },
  ];

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

            <LanguageSwitcher />
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="footer">
          <div className="footer-inner">
            <p className="footer-note">{t("footer.tagline")}</p>
            <div className="footer-links">
              <Link href="/legal/privacy">{t("footer.privacy")}</Link>
              <Link href="/legal/terms">{t("footer.terms")}</Link>
              <Link href="/support">{t("footer.support")}</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default function SiteLayout(props: Props) {
  return <SiteLayoutContent {...props} />;
}
