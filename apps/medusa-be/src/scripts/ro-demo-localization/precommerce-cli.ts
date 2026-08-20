import { access, link, open, unlink } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import {
  buildPrecommercePriceAuthority,
  type PrecommercePriceAuthorityBuild,
} from "../ro-demo-commerce/precommerce-price-authority"

export type PrecommercePriceAuthorityCliOptions = Readonly<{
  inventoryEnvelopePath: string
  mergedProductsPath: string
  outputPath: string
  rawLiveInventoryPath: string
}>

const FLAGS = [
  "--inventory",
  "--merged-products",
  "--pre-commerce-price-authority-output",
  "--raw-live-inventory",
] as const

export const parsePrecommercePriceAuthorityCliOptions = (
  argv: readonly string[]
): PrecommercePriceAuthorityCliOptions => {
  const values = new Map<string, string>()
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!(flag && FLAGS.includes(flag as (typeof FLAGS)[number]))) {
      throw new Error(`Unknown option ${flag ?? "<missing>"}`)
    }
    if (!(value && !value.startsWith("--"))) {
      throw new Error(`${flag} requires a file path`)
    }
    if (values.has(flag)) {
      throw new Error(`Duplicate option ${flag}`)
    }
    values.set(flag, value)
  }
  const missing = FLAGS.find((flag) => !values.has(flag))
  if (missing) {
    throw new Error(`Missing required option ${missing}`)
  }
  return {
    inventoryEnvelopePath: resolve(values.get("--inventory") as string),
    mergedProductsPath: resolve(values.get("--merged-products") as string),
    outputPath: resolve(
      values.get("--pre-commerce-price-authority-output") as string
    ),
    rawLiveInventoryPath: resolve(values.get("--raw-live-inventory") as string),
  }
}

const writeExclusiveAtomic = async (path: string, contents: string) => {
  const exists = await access(path).then(
    () => true,
    () => false
  )
  if (exists) {
    throw new Error(`Output already exists: ${path}`)
  }
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${Date.now()}.tmp`
  )
  const handle = await open(temporaryPath, "wx", 0o600)
  try {
    await handle.writeFile(contents, "utf8")
    await handle.sync()
    await handle.close()
    await link(temporaryPath, path)
    await unlink(temporaryPath)
  } catch (error) {
    await handle.close().catch(() => {
      // Best-effort cleanup after a failed atomic publication.
    })
    await unlink(temporaryPath).catch(() => {
      // Best-effort cleanup after a failed atomic publication.
    })
    throw error
  }
}

export const runPrecommercePriceAuthorityCli = async (
  argv: readonly string[] = process.argv.slice(2)
): Promise<PrecommercePriceAuthorityBuild> => {
  const options = parsePrecommercePriceAuthorityCliOptions(argv)
  const { readFile } = await import("node:fs/promises")
  const [inventoryEnvelopeJson, mergedProductsJsonl, rawLiveInventoryJson] =
    await Promise.all([
      readFile(options.inventoryEnvelopePath, "utf8"),
      readFile(options.mergedProductsPath, "utf8"),
      readFile(options.rawLiveInventoryPath, "utf8"),
    ])
  const result = buildPrecommercePriceAuthority({
    inventoryEnvelopeJson,
    mergedProductsJsonl,
    rawLiveInventoryJson,
  })
  await writeExclusiveAtomic(options.outputPath, result.canonicalJson)
  return result
}

export default async function generatePrecommercePriceAuthority() {
  const result = await runPrecommercePriceAuthorityCli()
  console.log(
    JSON.stringify({ outputKind: result.artifact.kind, sha256: result.sha256 })
  )
  return result
}
