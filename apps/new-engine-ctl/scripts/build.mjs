import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { build } from "esbuild"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDir, "..")
const outfile = resolve(appRoot, "dist/cli.js")

await mkdir(dirname(outfile), { recursive: true })

await build({
  entryPoints: [resolve(appRoot, "src/cli.ts")],
  outfile,
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  logLevel: "info",
  banner: {
    // commander still reaches CommonJS-only dynamic require paths.
    // Keep the runtime artifact ESM, but provide a scoped require bridge.
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
})
