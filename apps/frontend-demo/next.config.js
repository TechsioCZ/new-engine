/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["ui", "@techsio/storefront-data"],
  reactCompiler: true,
  // Removed 'output: export' to enable SSG with dynamic functions
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "medusa-13d1-9000.prg1.zerops.app",
      },
      {
        protocol: "https",
        hostname: "pub-adde8a563e2c43f7b6bc296d81c86358.r2.dev",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp"],
    qualities: [20, 40, 50, 60, 75, 90],
  },
  trailingSlash: true,
  // Optimize for serverless - exclude large binaries
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild",
      "node_modules/@rspack",
      "node_modules/webpack",
      "node_modules/rollup",
      "node_modules/terser",
      "node_modules/uglify-js",
    ],
  },
}

module.exports = nextConfig
