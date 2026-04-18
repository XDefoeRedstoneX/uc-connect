import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";

export default function UnauthorizedPage() {
  return (
    <SiteLayout title="Unauthorized | UC Connect">
      <section className="card">
        <h1>Unauthorized</h1>
        <p>You do not have permission to access this page.</p>
        <Link className="btn" href="/auth/login">Go to login</Link>
      </section>
    </SiteLayout>
  );
}
