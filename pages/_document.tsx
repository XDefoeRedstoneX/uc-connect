import { Html, Head, Main, NextScript } from "next/document";

// _document only runs server-side at the document level. App-wide <head>
// concerns belong here (favicon, lang). Per-page titles still live in each
// page's SiteLayout via next/head.
export default function Document() {
  return (
    <Html lang="id">
      <Head>
        {/* Use the brand SVG as the favicon (scales for retina + modern tabs).
            The previous default favicon.ico shipped from the Next.js template
            and showed the Vercel/Next mark in the browser tab. */}
        <link rel="icon" type="image/svg+xml" href="/logo-icon.svg" />
        <link rel="apple-touch-icon" href="/logo-icon.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
