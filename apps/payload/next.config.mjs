import { join } from "node:path"
import { withPayload } from "@payloadcms/next/withPayload"

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(import.meta.dirname, "../../"),
  reactCompiler: true,
  experimental: {
    turbopackRustReactCompiler: true,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
