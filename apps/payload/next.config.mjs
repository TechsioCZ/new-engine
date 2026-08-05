import { join } from "node:path"

import { withPayload } from "@payloadcms/next/withPayload"

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopackRustReactCompiler: true,
  },
  output: "standalone",
  outputFileTracingRoot: join(import.meta.dirname, "../../"),
  reactCompiler: true,
  typedRoutes: true,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
