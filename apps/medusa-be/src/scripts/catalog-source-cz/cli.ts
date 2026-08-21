import { isAbsolute } from "node:path"
import { buildCzechCatalogBundle } from "./generator"
import type { CzechCatalogEnvironment, CzechCatalogSourcePaths } from "./types"

type Options = Partial<CzechCatalogSourcePaths> &
  Partial<CzechCatalogEnvironment> & { outputDirectory?: string }

const ARGUMENTS: Readonly<Record<string, keyof Options>> = {
  "--brands-jsonl": "brandsJsonl",
  "--categories-jsonl": "categoriesJsonl",
  "--database-instance-fingerprint": "databaseInstanceFingerprint",
  "--environment-id": "environmentId",
  "--official-feed-xml": "officialFeedXml",
  "--official-pages-jsonl": "officialPagesJsonl",
  "--output-directory": "outputDirectory",
  "--products-jsonl": "productsJsonl",
  "--raw-inventory-json": "rawInventoryJson",
}

export const parseCzechCatalogSourceOptions = (args: readonly string[]) => {
  const options: Options = {}
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index] ?? ""
    const value = args[index + 1]
    const key = ARGUMENTS[name]
    if (!(key && value && !value.startsWith("--"))) {
      throw new Error(`invalid or missing argument ${name}`)
    }
    options[key] = value
  }
  const required = Object.values(ARGUMENTS)
  for (const key of required) {
    if (!options[key]) {
      throw new Error(`missing ${key}`)
    }
  }
  for (const key of [
    "brandsJsonl",
    "categoriesJsonl",
    "officialFeedXml",
    "officialPagesJsonl",
    "outputDirectory",
    "productsJsonl",
    "rawInventoryJson",
  ] as const) {
    if (!isAbsolute(options[key] as string)) {
      throw new Error(`${key} must be an absolute path`)
    }
  }
  return options as Readonly<{
    databaseInstanceFingerprint: string
    environmentId: string
    outputDirectory: string
  }> &
    CzechCatalogSourcePaths
}

export const runCzechCatalogSourceCli = async (args: readonly string[]) => {
  const {
    databaseInstanceFingerprint,
    environmentId,
    outputDirectory,
    ...sources
  } = parseCzechCatalogSourceOptions(args)
  const summary = await buildCzechCatalogBundle({
    environment: { databaseInstanceFingerprint, environmentId },
    outputDirectory,
    sources,
  })
  process.stdout.write(`${JSON.stringify(summary)}\n`)
}
