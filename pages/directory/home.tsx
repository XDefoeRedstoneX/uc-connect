import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";

export default function DirectoryHomePage() {
  return (
    <SiteLayout title="Directory Home | UC Connect">
      <section className="card">
        <h1>Directory</h1>
        <p>This page is now live and connected to real routes.</p>
        <div className="stack compact-top">
          <Link className="btn" href="/directory/explore">Explore vendors</Link>
          <Link className="btn secondary" href="/customer/profile">Open profile</Link>
        </div>
      </section>
    </SiteLayout>
  );
}
