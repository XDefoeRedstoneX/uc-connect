"use client";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/router";
import SiteLayout from "@/components/SiteLayout";
import AccountNav, { type AccountNavId } from "@/components/AccountNav";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/lib/auth-context";

type Props = {
  current: AccountNavId;
  title: string;
  description?: string;
  /** Render-prop receives the live token, or null while auth is still loading. */
  children: (token: string | null) => ReactNode;
};

// Shared shell for /customer/* pages. Lifts the auth bounce + AccountNav out
// of every page so the four pages stop re-implementing the same boilerplate
// (and the same per-mount /api/profile + getSession round-trip). Each page
// only renders its content given a token.
//
// Auth contract: anyone not logged in is redirected to /auth/login with
// `?next=` set to the current path. While the auth context is still loading
// the layout shows a LoadingScreen instead of flashing a redirect — prevents
// the "blink to login then back" race on slow connections.
export default function CustomerLayout({ current, title, description, children }: Props) {
  const router = useRouter();
  const { loading, isLoggedIn, token } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      const next = encodeURIComponent(router.asPath || "/customer/profile");
      void router.replace(`/auth/login?next=${next}`);
    }
  }, [loading, isLoggedIn, router]);

  if (loading || !isLoggedIn) {
    return (
      <SiteLayout title={title} description={description}>
        <LoadingScreen message="Memuat..." />
      </SiteLayout>
    );
  }

  return (
    <SiteLayout title={title} description={description}>
      <AccountNav current={current} />
      {children(token)}
    </SiteLayout>
  );
}
