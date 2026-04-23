import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";
import { GetServerSideProps } from "next";

export default function SessionExpiredPage() {
  return (
    <SiteLayout title="Session Expired | UC Connect">
      <section className="card">
        <h1>Session Expired</h1>
        <p>Your session has expired. Please sign in again.</p>
        <Link className="btn" href="/auth/login">Login again</Link>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
