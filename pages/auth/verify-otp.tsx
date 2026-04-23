import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";
import { GetServerSideProps } from "next";

export default function VerifyOtpPage() {
  return (
    <SiteLayout title="Verify OTP | UC Connect">
      <section className="card">
        <h1>Verify OTP</h1>
        <p>
          Phone/SMS OTP has been disabled to keep this project low-cost.
        </p>
        <div className="row-gap">
          <Link className="btn" href="/auth/login">Go to login</Link>
          <Link className="btn secondary" href="/auth/register">Create account</Link>
        </div>
      </section>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
