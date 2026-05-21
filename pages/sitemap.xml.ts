import type { GetServerSideProps } from "next";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function SiteMap() {
  return null;
}

const STATIC_PATHS = ["/", "/directory/explore", "/community", "/support", "/legal/privacy", "/legal/terms"];

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const host = req.headers.host ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = `${proto}://${host}`;

  const urls: { loc: string; lastmod?: string }[] = STATIC_PATHS.map((p) => ({ loc: `${base}${p}` }));

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase
      .from("vendors")
      .select("id,updated_at")
      .eq("is_verified", true)
      .limit(5000);
    for (const v of data ?? []) {
      urls.push({ loc: `${base}/directory/vendor/${v.id}`, lastmod: v.updated_at ?? undefined });
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
      .join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.write(body);
  res.end();
  return { props: {} };
};

export default SiteMap;
