"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for delete/reject/irreversible actions. */
  destructive?: boolean;
};

type ConfirmCtx = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmCtx>({ confirm: async () => false });

export function useConfirm() {
  return useContext(ConfirmContext).confirm;
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

// Promise-based replacement for window.confirm — same call shape
// (`if (!(await confirm({...}))) return;`) but themed, accessible, and
// non-blocking. Lives in _app so any component can call useConfirm().
export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    setPending((p) => {
      p?.resolve(ok);
      return null;
    });
  }, []);

  // Focus the confirm button on open + wire Escape/Enter.
  useEffect(() => {
    if (!pending) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => close(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(15,23,42,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
            animation: "fade-in 0.15s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: "var(--radius-md, 14px)",
              width: "min(420px, 100%)", padding: "1.4rem",
              boxShadow: "0 20px 60px rgba(15,23,42,0.28)",
            }}
          >
            <h2 id="confirm-title" style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "var(--text)" }}>
              {pending.title}
            </h2>
            {pending.message && (
              <p style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", lineHeight: 1.55, color: "var(--muted)" }}>
                {pending.message}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ghost"
                onClick={() => close(false)}
                style={{ fontSize: "0.88rem", padding: "0.5rem 1rem" }}
              >
                {pending.cancelLabel ?? "Batal"}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => close(true)}
                style={{
                  fontSize: "0.88rem", padding: "0.5rem 1.1rem",
                  background: pending.destructive ? "var(--error)" : undefined,
                }}
              >
                {pending.confirmLabel ?? "Ya"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
