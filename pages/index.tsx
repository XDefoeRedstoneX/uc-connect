import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";

const links = [
  { href: "/auth/login", label: "Login" },
  { href: "/auth/register", label: "Register" },
  { href: "/auth/forgot-password", label: "Forgot Password" },
  { href: "/auth/verify-otp", label: "Verify OTP" },
  { href: "/directory/home", label: "Directory Home" },
  { href: "/directory/explore", label: "Explore Vendors" },
  { href: "/customer/profile", label: "Customer Profile" },
  { href: "/customer/edit-profile", label: "Edit Profile" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/support", label: "Support" },
  { href: "/api/health", label: "API Health" },
];

export default function Home() {
  return (
    <SiteLayout title="UC Connect">
      <section className="card">
        <h1>UC Connect MVP</h1>
        <p>
          This app is now an implementation baseline with real authentication/data wiring hooks.
        </p>
        <ul className="grid-links">
          {links.map((item) => (
            <li key={item.href}>
              <Link className="btn" href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}
