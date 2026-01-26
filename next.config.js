/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Optimize package imports to reduce bundle size
    // Automatically transforms barrel file imports to direct imports
    optimizePackageImports: [],
  },
}

module.exports = nextConfig
