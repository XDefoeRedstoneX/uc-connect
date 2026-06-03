import type { NextConfig } from "next";

// Parse Supabase project host once so next/image can load storage URLs from it
// without needing a wildcard. Falls back to a broad **.supabase.co pattern if
// the env var is missing or malformed (won't crash the build).
const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseHost
      ? [
          { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
          { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/sign/**" },
        ]
      : [{ protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/**" }],
  },
  // Baseline security headers. CSP intentionally omitted — Midtrans Snap
  // injects an iframe whose origin shifts between sandbox.midtrans.com and
  // app.midtrans.com, and getting a strict CSP right needs a separate pass.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
