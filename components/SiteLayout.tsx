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
};

export default function SiteLayout({ title, children }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isVendor, setIsVendor] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      try {
        const resp = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        const json = await resp.json();
        if (resp.ok && json.profile && json.profile.role === 'vendor') {
          setIsVendor(true);
        }
      } catch (e) {
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

            <nav className="topnav" aria-label="Primary navigation" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ))}
              <Link href="/customer/profile" aria-label="User Profile" style={{ display: 'flex', alignItems: 'center', color: '#1f2937' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>

              {isVendor && (
                <button
                  type="button"
                  onClick={() => router.push('/vendor/dashboard')}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50"
                >
                  Vendor Dashboard
                </button>
              )}
            </nav>
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
