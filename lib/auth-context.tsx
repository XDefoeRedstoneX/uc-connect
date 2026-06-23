"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Role = "customer" | "vendor" | "admin" | null;

type AuthState = {
  loading: boolean;
  isLoggedIn: boolean;
  role: Role;
  userId: string | null;
  /**
   * Cached JWT access token. May lag the live session by a few seconds
   * if Supabase auto-refreshes; pages that need a guaranteed-fresh token
   * for a sensitive call should use `getAccessToken()` from the helper
   * below instead of reading this directly.
   */
  token: string | null;
  /** Force a re-read of session + profile (e.g. after onboarding flips role). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Lives above the page in _app, so the role is fetched once per session and
// shared across navigations instead of every SiteLayout mount re-hitting
// /api/profile. Refreshes automatically on Supabase auth state changes.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session?.access_token) {
      setIsLoggedIn(false);
      setRole(null);
      setUserId(null);
      setToken(null);
      setLoading(false);
      return;
    }
    setIsLoggedIn(true);
    setUserId(session.user?.id ?? null);
    setToken(session.access_token);
    try {
      const resp = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await resp.json().catch(() => ({}));
      setRole(resp.ok && json.profile?.role ? json.profile.role : "customer");
    } catch {
      setRole("customer");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    // Re-read on sign-in / sign-out / token refresh so the nav reflects reality
    // without a manual page reload.
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ loading, isLoggedIn, role, userId, token, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Safe fallback for any component rendered outside the provider (shouldn't
    // happen via _app, but keeps SSR/tests from throwing).
    return { loading: false, isLoggedIn: false, role: null, userId: null, token: null, refresh: async () => {} };
  }
  return ctx;
}

/**
 * Always reads the *live* JWT from supabase-js (which auto-refreshes
 * silently). Use this in fetch() calls instead of the cached `token` from
 * useAuth() — that one can be a few seconds stale right after Supabase
 * rotates the token, which is enough to make some API calls 401.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
