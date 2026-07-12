/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow LAN / alternate localhost hosts to hit HMR + /_next/* in `next dev`
  // (avoids blocked cross-origin + noisy allowedDevOrigins warnings).
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "192.168.0.233",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Barrel opt for drei only — three/gsap OPI can break under Turbopack.
    optimizePackageImports: ["@react-three/drei"],
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
