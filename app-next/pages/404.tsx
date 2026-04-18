import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";

export default function NotFoundPage() {
  return (
    <SiteLayout title="404 | UC Connect">
      <section className="card">
        <h1>Page not found</h1>
        <p>The route you requested does not exist.</p>
        <Link className="btn" href="/">Back to home</Link>
      </section>
    </SiteLayout>
  );
}
