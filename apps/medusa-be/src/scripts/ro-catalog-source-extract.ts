import { resolve } from "node:path"
import type { ExecArgs } from "@medusajs/framework/types"
import { toOfficialPublicUrl } from "./ro-catalog-source-extract-parser"
import { runRoCatalogSourceExtract } from "./ro-catalog-source-extract-runtime"
import type { RoSourceExtractOptions } from "./ro-catalog-source-extract-types"

const DEFAULT_OUTPUT_ROOT = "var/ro-catalog-source"
const OPTION_PATTERN = /^--([a-z-]+)=(.+)$/
const HELP = `Read-only Romanian catalog source extractor

Usage:
  medusa exec ./src/scripts/ro-catalog-source-extract.ts [options]

Options:
  --sitemap-url=<url>       Official public sitemap (default: https://www.herbatica.ro/sitemap.xml)
  --output=<path>           Unapproved candidate manifest JSON
  --cache-dir=<path>        Local HTTP evidence cache
  --checkpoint=<path>       Local resumable checkpoint
  --delay-ms=<ms>           Minimum delay between request starts (default: 1500)
  --concurrency=<1|2>       Low-concurrency worker count (default: 1)
  --max-pages=<count>       Safety cap for this run (default: 25)
  --timeout-ms=<ms>         Per-request timeout (default: 20000)
  --max-body-bytes=<bytes>  Response size cap (default: 5000000)
  --refresh                 Ignore valid local cache records
  --help                    Print this help

This command performs public GET requests and local file writes only. It cannot
call /api, /export, /action, /admin, or /script paths and never imports data.
`

const integerOption = (
  values: Map<string, string>,
  name: string,
  range: Readonly<{ fallback: number; maximum: number; minimum: number }>
) => {
  const { fallback, maximum, minimum } = range
  const raw = values.get(name)
  if (raw === undefined) {
    return fallback
  }
  const value = Number(raw)
  if (!(Number.isSafeInteger(value) && value >= minimum && value <= maximum)) {
    throw new Error(
      `--${name} must be an integer from ${minimum} to ${maximum}`
    )
  }
  return value
}

export const parseRoSourceExtractArgs = (
  args: readonly string[],
  cwd = process.cwd()
): RoSourceExtractOptions | "help" => {
  const values = new Map<string, string>()
  let refresh = false
  for (const argument of args) {
    if (argument === "--help") {
      return "help"
    }
    if (argument === "--refresh") {
      refresh = true
      continue
    }
    const match = OPTION_PATTERN.exec(argument)
    if (!match) {
      throw new Error(`Unknown argument: ${argument}`)
    }
    values.set(match[1] ?? "", match[2] ?? "")
  }
  const supported = new Set([
    "cache-dir",
    "checkpoint",
    "concurrency",
    "delay-ms",
    "max-body-bytes",
    "max-pages",
    "output",
    "sitemap-url",
    "timeout-ms",
  ])
  const unknown = [...values.keys()].find((name) => !supported.has(name))
  if (unknown) {
    throw new Error(`Unknown option: --${unknown}`)
  }
  const outputRoot = resolve(cwd, DEFAULT_OUTPUT_ROOT)
  const sitemapUrl = toOfficialPublicUrl(
    values.get("sitemap-url") ?? "https://www.herbatica.ro/sitemap.xml"
  )
  return {
    cacheDir: resolve(values.get("cache-dir") ?? `${outputRoot}/cache`),
    checkpointPath: resolve(
      values.get("checkpoint") ?? `${outputRoot}/checkpoint.json`
    ),
    concurrency: integerOption(values, "concurrency", {
      fallback: 1,
      maximum: 2,
      minimum: 1,
    }),
    delayMs: integerOption(values, "delay-ms", {
      fallback: 1500,
      maximum: 60_000,
      minimum: 1000,
    }),
    maxBodyBytes: integerOption(values, "max-body-bytes", {
      fallback: 5_000_000,
      maximum: 20_000_000,
      minimum: 100_000,
    }),
    maxPages: integerOption(values, "max-pages", {
      fallback: 25,
      maximum: 100_000,
      minimum: 1,
    }),
    outputPath: resolve(
      values.get("output") ?? `${outputRoot}/candidates.unapproved.json`
    ),
    refresh,
    requestTimeoutMs: integerOption(values, "timeout-ms", {
      fallback: 20_000,
      maximum: 120_000,
      minimum: 1000,
    }),
    sitemapUrl,
    userAgent:
      process.env.RO_SOURCE_USER_AGENT ??
      "HerbatikaCatalogAudit/1.0 (internal localization migration; respectful crawler)",
  }
}

export default async function roCatalogSourceExtract({ args }: ExecArgs) {
  const options = parseRoSourceExtractArgs(args)
  if (options === "help") {
    console.log(HELP)
    return
  }
  const result = await runRoCatalogSourceExtract(options)
  console.log(
    `RO source extraction wrote ${result.manifest.products.length} unapproved candidate(s) to ${options.outputPath}; ${result.pendingPages} page(s) remain in the checkpoint.`
  )
}
