import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  output: "standalone",
  // Pin the project root: the template may live inside a monorepo checkout
  // whose parent lockfile would otherwise be picked as the workspace root.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    typedEnv: true,
  },
}

export default nextConfig
