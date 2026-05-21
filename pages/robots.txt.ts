import type { GetServerSideProps } from "next";

// Served at /robots.txt. Built from the request host so it works on any domain.
function RobotsTxt() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const host = req.headers.host ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = `${proto}://${host}`;

  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api",
    "Disallow: /vendor/dashboard",
    "Disallow: /customer",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.write(body);
  res.end();
  return { props: {} };
};

export default RobotsTxt;
