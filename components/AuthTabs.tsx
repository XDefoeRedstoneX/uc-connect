import Link from "next/link";

type AuthTabsProps = {
  currentPage: "login" | "register";
};

export default function AuthTabs({ currentPage }: AuthTabsProps) {
  return (
    <div className="auth-tabs" aria-label="Authentication tabs">
      <Link href="/auth/login" className={`auth-tab-link ${currentPage === "login" ? "active" : ""}`}>
        Masuk / Login
      </Link>
      <Link href="/auth/register" className={`auth-tab-link ${currentPage === "register" ? "active" : ""}`}>
        Daftar / Register
      </Link>
    </div>
  );
}
