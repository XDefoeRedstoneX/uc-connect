import type { ReactNode } from "react";

type AuthSplitLayoutProps = {
  children: ReactNode;
  visualPanel?: ReactNode;
  labelledBy?: string;
};

export default function AuthSplitLayout({ children, visualPanel, labelledBy }: AuthSplitLayoutProps) {
  return (
    <section className="auth-shell" aria-labelledby={labelledBy}>
      <div className="auth-form-panel">{children}</div>
      {visualPanel && (
        <aside className="auth-visual-panel" aria-label="Authentication highlight">
          <img
            src="/images/vendor-placeholder.svg"
            alt="Campus lifestyle illustration"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "70%",
              maxWidth: "300px",
              opacity: 0.15,
              zIndex: 0,
            }}
          />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
            {visualPanel}
          </div>
        </aside>
      )}
    </section>
  );
}
