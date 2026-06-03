import Link from "next/link";

type AuthTabsProps = {
  currentPage: "login" | "register";
  // Optional post-auth destination, threaded through both tabs so toggling
  // between Login/Register doesn't drop a deep-link (e.g. vendor onboarding).
  next?: string;
};

export default function AuthTabs({ currentPage, next }: AuthTabsProps) {
  const suffix = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="auth-tabs" aria-label="Authentication tabs">
      <Link href={`/auth/login${suffix}`} className={`auth-tab-link ${currentPage === "login" ? "active" : ""}`}>
        Masuk / Login
      </Link>
      <Link href={`/auth/register${suffix}`} className={`auth-tab-link ${currentPage === "register" ? "active" : ""}`}>
        Daftar / Register
      </Link>
    </div>
  );
}
