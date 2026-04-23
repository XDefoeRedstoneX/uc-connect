import Link from "next/link";

export default function NotFoundPage() {
  return (
    <>
      <head>
        <title>404 | UC Connect</title>
      </head>
      <section className="card">
        <h1>Page not found</h1>
        <p>The route you requested does not exist.</p>
        <Link className="btn" href="/">Back to home</Link>
      </section>
    </>
  );
}
