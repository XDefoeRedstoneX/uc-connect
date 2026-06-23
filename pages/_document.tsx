import { Html, Head, Main, NextScript } from "next/document";

// _document only runs server-side at the document level. App-wide <head>
// concerns belong here (favicon, lang, manifest). Per-page titles still live
// in each page's SiteLayout via next/head.
export default function Document() {
  return (
    <Html lang="id">
      <Head>
        {/* Browser tab + iOS Safari favicon. */}
        <link rel="icon" type="image/svg+xml" href="/logo-icon.svg" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* PWA manifest — turns the site into an installable app on Android.
            Mobile Chrome auto-shows the "Add to Home Screen" prompt after a
            few visits once the manifest + service worker are present (SW is
            optional for install but required for offline; we ship manifest
            now, can add SW later without changes here). */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#1CA9C9" />
        <meta name="application-name" content="UC Connect" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="UC Connect" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
