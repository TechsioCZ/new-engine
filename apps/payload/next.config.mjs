import { join } from "node:path"
import { withPayload } from "@payloadcms/next/withPayload"

const isTurbopack = Boolean(process.env.TURBOPACK)
const turbopackRustCompiler = isTurbopack
  ? { turbopackRustReactCompiler: true }
  : {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(import.meta.dirname, "../../"),
  reactCompiler: isTurbopack,
  experimental: turbopackRustCompiler,
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
