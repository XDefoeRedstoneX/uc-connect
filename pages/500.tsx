import Link from "next/link";

export default function ServerErrorPage() {
  return (
    <>
      <head>
        <title>500 | UC Connect</title>
      </head>
      <section className="card">
        <h1>Server error</h1>
        <p>Something went wrong while processing your request.</p>
        <Link className="btn" href="/support">Contact support</Link>
      </section>
    </>
  );
}
