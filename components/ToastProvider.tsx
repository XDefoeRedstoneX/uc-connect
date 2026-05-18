"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastCtx = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastCtx>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const colorMap: Record<ToastType, string> = {
    success: "var(--success, #059669)",
    error: "var(--error, #dc2626)",
    info: "var(--pacific, #1CA9C9)",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container — top center */}
      <div style={{
        position: "fixed", top: "1rem", left: "50%", transform: "translateX(-50%)",
        zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.5rem",
        pointerEvents: "none", width: "min(420px, 90vw)",
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="toast-enter"
            onClick={() => dismiss(toast.id)}
            style={{
              pointerEvents: "auto", cursor: "pointer",
              background: "#fff", borderRadius: "10px",
              padding: "0.75rem 1.15rem",
              boxShadow: "0 6px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              display: "flex", alignItems: "center", gap: "0.6rem",
              borderLeft: `4px solid ${colorMap[toast.type]}`,
              animation: "toast-slide-down 0.35s ease-out",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
            </span>
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text, #1a1a1a)", flex: 1 }}>
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
