"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";

// Lightweight "Install UC Connect" bar that surfaces the
// beforeinstallprompt event Android Chrome fires after a couple of visits.
//
// - Stores its own dismissal in localStorage so a closed prompt stays closed
//   across navigations (we don't want a nag bar on every page).
// - Hides itself once display-mode is standalone (already installed).
// - No-op on iOS Safari (no beforeinstallprompt support); iOS users can still
//   "Add to Home Screen" manually via the share sheet.
//
// Drop one of these high in the layout (it positions itself; takes no space
// when hidden). Should not block rendering — purely opt-in CTA.

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "ucc:install-prompt:dismissed";

export default function InstallPrompt() {
  const [event, setEvent] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already running as installed PWA — never show the bar.
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") {
      setDismissed(true);
      return;
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop Chrome's own mini-infobar
      setEvent(e as BIPEvent);
    };
    const onInstalled = () => {
      setEvent(null);
      localStorage.setItem(DISMISSED_KEY, "1");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (dismissed || !event) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "dismissed") {
        // Persist so the bar doesn't reappear on the next page load — user
        // can still install via Chrome menu > "Install app" any time.
        localStorage.setItem(DISMISSED_KEY, "1");
        setDismissed(true);
      }
      setEvent(null);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Install UC Connect"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 50,
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 12px 36px rgba(15,23,42,0.12)",
        padding: "0.85rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      <span style={{ display: "inline-flex", padding: 8, borderRadius: 10, background: "var(--pacific-soft)", color: "var(--pacific-dark)" }}>
        <Icon name="store" size={18} strokeWidth={2.4} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>Install UC Connect</p>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>Tambahkan ke layar utama untuk akses cepat.</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup"
        style={{ background: "transparent", border: "none", color: "var(--muted)", padding: 6, cursor: "pointer" }}
      >
        <Icon name="x" size={16} />
      </button>
      <button
        type="button"
        onClick={() => void handleInstall()}
        disabled={installing}
        className="btn"
        style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
      >
        {installing ? "..." : "Install"}
      </button>
    </div>
  );
}
