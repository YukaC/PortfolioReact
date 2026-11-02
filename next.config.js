/**
 * Keep default distDir `.next`. The tree lives on NVMe; do not symlink
 * node_modules/.next across filesystems (Turbopack rejects it).
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow LAN / alternate localhost hosts to hit HMR + /_next/* in `next dev`
  // (avoids blocked cross-origin + noisy allowedDevOrigins warnings).
  // 100.120.254.30 + yuka.tail901e3b.ts.net are this machine over Tailscale, for
  // opening the dev server on a phone; update them if the tailnet name changes.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "192.168.0.233",
    "192.168.0.234",
    "100.120.254.30",
    "yuka.tail901e3b.ts.net",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    // Hero/work-card images request quality 70 — allow it beside the 75 default.
    qualities: [70, 75],
  },
  experimental: {
    // Barrel opt for drei only — three/gsap OPI can break under Turbopack.
    optimizePackageImports: ["@react-three/drei"],
    // The site has two root layouts (`(en)` and `(intl)/[lang]`, because
    // `<html lang>` belongs to the route), and a `not-found.jsx` is rendered
    // inside a root layout. `global-not-found.jsx` is the documented way to give
    // unmatched URLs a page of the site's own instead of the built-in one
    // (audit.md §16.1: `pages/404.jsx` → `app/not-found.jsx`).
    globalNotFound: true,
  },
  /**
   * `/test` — the measuring route, and only while `next dev` runs.
   *
   * The meter (`src/perf/meter.js`) measures the page it runs on: frame pacing,
   * long tasks, LCP/CLS, the anomaly scan and the field layers. So `/test` is not
   * a page — a page of its own would only ever measure itself — it is a rewrite
   * onto the real site, and the overlay that drives the meter mounts on the
   * client when the URL says `/test`. `/test/es`, `/test/pt` and
   * `/test/work/<slug>` follow the same rule, so a phone measures the document it
   * would really open.
   *
   * In any other environment the list is empty: no route, no overlay, and the URL
   * falls through to `global-not-found` like any other unknown path. That is the
   * whole privacy of it — there is nothing to disable at deploy time, because the
   * route does not exist in a build (`src/lib/test-route-contract.test.js` pins
   * both halves).
   */
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    return [
      { source: "/test", destination: "/" },
      { source: "/test/:path*", destination: "/:path*" },
    ];
  },

  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const csp = [
      "default-src 'self'",
      // unsafe-eval: Next HMR + WASM (GLTF/draco). Report-only — keep until CSP is enforced.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    // Skip nosniff in dev: Next 16 Turbopack serves _clientMiddlewareManifest.js
    // as application/json; Chrome + nosniff refuses to execute it (vercel/next#92180).
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      ...(isDev
        ? []
        : [{ key: "X-Content-Type-Options", value: "nosniff" }]),
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Content-Security-Policy-Report-Only",
        value: csp,
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
