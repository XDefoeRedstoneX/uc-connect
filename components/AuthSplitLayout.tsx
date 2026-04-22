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
          {visualPanel}
        </aside>
      )}
    </section>
  );
}
