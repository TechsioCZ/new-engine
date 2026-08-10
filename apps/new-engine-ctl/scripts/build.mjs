/// <reference types="node" />

import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { build } from "esbuild"

const appRoot = new URL("../", import.meta.url)
const outfile = fileURLToPath(new URL("dist/cli.js", appRoot))

await mkdir(fileURLToPath(new URL("dist/", appRoot)), { recursive: true })

await build({
  banner: {
    // commander still reaches CommonJS-only dynamic require paths.
    // Keep the runtime artifact ESM, but provide a scoped require bridge.
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  bundle: true,
  entryPoints: [fileURLToPath(new URL("src/cli.ts", appRoot))],
  format: "esm",
  logLevel: "info",
  outfile,
  platform: "node",
  target: "node24",
})
