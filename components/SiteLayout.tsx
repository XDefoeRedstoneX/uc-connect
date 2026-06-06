"use client";

import Head from "next/head";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/router";
import NotificationBell from "@/components/NotificationBell";
import Icon, { type IconName } from "@/components/ui/Icon";

type Props = {
  title: string;
  children: ReactNode;
  description?: string;
  ogImage?: string;
};

export default function SiteLayout({ title, children, description, ogImage }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  // Role comes from the app-level AuthProvider (fetched once per session), so
  // navigating between pages no longer re-hits /api/profile on every mount.
  const { isLoggedIn, role } = useAuth();
  const isVendor = role === "vendor";
  const isAdmin = role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);

  // Mark the active top-level section so the current page is indicated.
  const isActive = (href: string) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href);

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/community", label: "Komunitas" },
    { href: "/directory/explore", label: t("nav.explore") },
  ];

  // Account sub-pages — surfaced in the mobile drawer so favorites / reviews /
  // threads aren't reachable only by typing the URL.
  const accountItems: { href: string; label: string; icon: IconName }[] = [
    { href: "/customer/favorites", label: "Favorit Saya", icon: "heart" },
    { href: "/customer/reviews", label: "Ulasan Saya", icon: "star" },
    { href: "/customer/threads", label: "Diskusi Saya", icon: "chat" },
  ];

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {description && <meta name="description" content={description} />}
        <meta property="og:title" content={title} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:type" content="website" />
        <meta property="og:image" content={ogImage ?? "/og-default.png"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        {description && <meta name="twitter:description" content={description} />}
      </Head>
      <div className="site-shell">
        <a href="#main-content" className="skip-link">Lewati ke konten</a>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand" aria-label="UC Connect homepage">
              <img src="/logo-icon.svg" alt="UC Connect icon" className="brand-mark" />
              <span className="brand-text">
                <span className="brand-title">UC Connect</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="topnav" aria-label="Primary navigation" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-link"
                    aria-current={active ? "page" : undefined}
                    // Stronger visual differentiation: the active page is a
                    // filled pacific-soft pill with a darker text + ring;
                    // inactive items sit on translucent white so the eye
                    // jumps to the active one without relying on font weight.
                    style={
                      active
                        ? {
                            background: "var(--pacific-soft)",
                            color: "var(--pacific-dark)",
                            borderColor: "var(--pacific)",
                            fontWeight: 700,
                            boxShadow: "inset 0 0 0 1px rgba(28,169,201,0.25)",
                          }
                        : {
                            background: "rgba(255,255,255,0.6)",
                            color: "var(--text)",
                            fontWeight: 600,
                          }
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}

              {isVendor && (
                <button
                  type="button"
                  onClick={() => router.push('/vendor/dashboard')}
                  className="nav-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#fff', fontWeight: 700, color: 'var(--orange)', border: '1.5px solid var(--orange-light)' }}
                >
                  <Icon name="store" size={15} strokeWidth={2.3} /> Dashboard
                </button>
              )}

              {isAdmin && (
                <Link href="/admin" className="nav-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#fff', fontWeight: 700, color: 'var(--orange-dark)', border: '1.5px solid var(--orange)' }}>
                  <Icon name="shield" size={15} strokeWidth={2.3} /> Admin
                </Link>
              )}

              {isLoggedIn ? (
                <>
                  <NotificationBell />
                  <Link href="/customer/profile" aria-label="Profil Saya" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, color: 'var(--pacific-dark)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profil
                  </Link>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="nav-link"
                  // Primary CTA: solid pacific fill + white text so the
                  // sign-in entry point reads as an action, not a nav item.
                  style={{
                    background: 'var(--pacific)',
                    color: '#fff',
                    fontWeight: 700,
                    borderColor: 'var(--pacific)',
                    boxShadow: '0 2px 8px rgba(28,169,201,0.25)',
                  }}
                >
                  Masuk
                </Link>
              )}
            </nav>

            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                display: 'none',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '8px',
                width: '2.2rem', height: '2.2rem',
                cursor: 'pointer',
                fontSize: '1.1rem',
              }}
              className="hamburger-btn"
            >
              <Icon name={menuOpen ? "x" : "menu"} size={20} strokeWidth={2.4} />
            </button>
          </div>

          {/* Mobile drawer */}
          {menuOpen && (
            <nav
              aria-label="Mobile navigation"
              style={{
                background: 'var(--panel)',
                borderTop: '1px solid var(--border)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                  onClick={() => setMenuOpen(false)}
                  style={{ color: 'var(--text)', background: 'var(--bg)' }}
                >
                  {item.label}
                </Link>
              ))}
              {isVendor && (
                <Link href="/vendor/dashboard" className="nav-link" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--orange)', background: 'var(--orange-soft)' }}>
                  <Icon name="store" size={16} strokeWidth={2.3} /> Vendor Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="nav-link" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--orange-dark)', background: 'var(--orange-soft)' }}>
                  <Icon name="shield" size={16} strokeWidth={2.3} /> Admin Panel
                </Link>
              )}
              {isLoggedIn ? (
                <>
                  <Link href="/notifications" className="nav-link" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--pacific-dark)', background: 'var(--pacific-soft)' }}>
                    <Icon name="bell" size={16} strokeWidth={2.3} /> Notifikasi
                  </Link>
                  <Link href="/customer/profile" className="nav-link" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--pacific-dark)', background: 'var(--pacific-soft)' }}>
                    <Icon name="user" size={16} strokeWidth={2.3} /> Profil Saya
                  </Link>
                  {accountItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="nav-link"
                      onClick={() => setMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text)', background: 'var(--bg)' }}
                    >
                      <Icon name={item.icon} size={16} strokeWidth={2.3} /> {item.label}
                    </Link>
                  ))}
                </>
              ) : (
                <Link href="/auth/login" className="nav-link" onClick={() => setMenuOpen(false)} style={{ color: 'var(--pacific-dark)', background: 'var(--pacific-soft)' }}>
                  Masuk / Daftar
                </Link>
              )}
            </nav>
          )}
        </header>

        <main id="main-content" className="content">{children}</main>

        <footer className="footer">
          <div className="footer-inner">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <p className="footer-note" style={{ margin: 0 }}>
                <strong style={{ color: 'var(--text)' }}>UC Connect</strong>
              </p>
              <p className="footer-note" style={{ margin: 0 }}>{t("footer.tagline")}</p>
            </div>
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
