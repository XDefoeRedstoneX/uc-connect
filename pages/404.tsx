import Link from "next/link";
import Head from "next/head";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>404 | UC Connect</title>
      </Head>
      <section className="card">
        <h1>Page not found</h1>
        <p>The route you requested does not exist.</p>
        <Link className="btn" href="/">Back to home</Link>
      </section>
    </>
  );
}
