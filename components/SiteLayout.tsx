"use client";

import Head from "next/head";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

type Props = {
  title: string;
  children: ReactNode;
  description?: string;
  ogImage?: string;
};

export default function SiteLayout({ title, children, description, ogImage }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isVendor, setIsVendor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      setIsLoggedIn(true);

      try {
        const resp = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        const json = await resp.json();
        if (resp.ok && json.profile) {
          if (json.profile.role === 'vendor') setIsVendor(true);
          if (json.profile.role === 'admin') setIsAdmin(true);
        }
      } catch {
        // ignore
      }
    };

    void load();
  }, []);

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/community", label: "Komunitas" },
    { href: "/directory/explore", label: t("nav.explore") },
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
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ))}

              {isVendor && (
                <button
                  type="button"
                  onClick={() => router.push('/vendor/dashboard')}
                  className="nav-link"
                  style={{ background: '#fff', fontWeight: 700, color: 'var(--orange)', border: '1.5px solid var(--orange-light)' }}
                >
                  🏪 Dashboard
                </button>
              )}

              {isAdmin && (
                <Link href="/admin" className="nav-link"
                  style={{ background: '#fff', fontWeight: 700, color: 'var(--orange-dark)', border: '1.5px solid var(--orange)' }}>
                  🛡 Admin
                </Link>
              )}

              {isLoggedIn ? (
                <Link href="/customer/profile" aria-label="Profil Saya" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, color: 'var(--pacific-dark)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Profil
                </Link>
              ) : (
                <Link href="/auth/login" className="nav-link" style={{ background: '#fff', fontWeight: 700, color: 'var(--pacific-dark)' }}>
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
              {menuOpen ? "✕" : "☰"}
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
                <Link href="/vendor/dashboard" className="nav-link" onClick={() => setMenuOpen(false)} style={{ color: 'var(--orange)', background: 'var(--orange-soft)' }}>
                  🏪 Vendor Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="nav-link" onClick={() => setMenuOpen(false)} style={{ color: 'var(--orange-dark)', background: 'var(--orange-soft)' }}>
                  🛡 Admin Panel
                </Link>
              )}
              {isLoggedIn ? (
                <Link href="/customer/profile" className="nav-link" onClick={() => setMenuOpen(false)} style={{ color: 'var(--pacific-dark)', background: 'var(--pacific-soft)' }}>
                  👤 Profil Saya
                </Link>
              ) : (
                <Link href="/auth/login" className="nav-link" onClick={() => setMenuOpen(false)} style={{ color: 'var(--pacific-dark)', background: 'var(--pacific-soft)' }}>
                  Masuk / Daftar
                </Link>
              )}
            </nav>
          )}
        </header>

        <main className="content">{children}</main>

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
