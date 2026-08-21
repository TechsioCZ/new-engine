import { open, readFile } from "node:fs/promises"
import { isAbsolute } from "node:path"
import { stableCatalogTranslationJson } from "../catalog-translation-pipeline/canonical"
import { buildRomanianCatalogSourceBundle } from "./generator"

type Options = Readonly<{
  attestationOutput: string
  authorityOutput: string
  catalogEntities: string
  databaseInstanceFingerprint: string
  environmentId: string
  inventoryEnvelope: string
  manifestOutput: string
  mergedCategories: string
  mergedProducts: string
  preimagesOutput: string
  rawLiveInventory: string
}>

const PATH_FLAGS = new Set([
  "--attestation-output",
  "--authority-output",
  "--catalog-entities",
  "--inventory-envelope",
  "--manifest-output",
  "--merged-categories",
  "--merged-products",
  "--preimages-output",
  "--raw-live-inventory",
])

const parseOptions = (args: readonly string[]): Options => {
  const values = new Map<string, string>()
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]
    const value = args[index + 1]
    if (!(name?.startsWith("--") && value) || values.has(name)) {
      throw new Error(
        "catalog-source-ro arguments must be unique flag/value pairs"
      )
    }
    values.set(name, value)
  }
  const required = [
    "--attestation-output",
    "--authority-output",
    "--catalog-entities",
    "--database-instance-fingerprint",
    "--environment-id",
    "--inventory-envelope",
    "--manifest-output",
    "--merged-categories",
    "--merged-products",
    "--preimages-output",
    "--raw-live-inventory",
  ] as const
  for (const name of required) {
    if (!values.get(name)) {
      throw new Error(`Missing argument: ${name}`)
    }
  }
  for (const name of PATH_FLAGS) {
    if (!isAbsolute(values.get(name) as string)) {
      throw new Error(`${name} must be an absolute path`)
    }
  }
  return {
    attestationOutput: values.get("--attestation-output") as string,
    authorityOutput: values.get("--authority-output") as string,
    catalogEntities: values.get("--catalog-entities") as string,
    databaseInstanceFingerprint: values.get(
      "--database-instance-fingerprint"
    ) as string,
    environmentId: values.get("--environment-id") as string,
    inventoryEnvelope: values.get("--inventory-envelope") as string,
    manifestOutput: values.get("--manifest-output") as string,
    mergedCategories: values.get("--merged-categories") as string,
    mergedProducts: values.get("--merged-products") as string,
    preimagesOutput: values.get("--preimages-output") as string,
    rawLiveInventory: values.get("--raw-live-inventory") as string,
  }
}

const writeNewCanonicalJson = async (path: string, value: unknown) => {
  const handle = await open(path, "wx", 0o600)
  try {
    await handle.writeFile(`${stableCatalogTranslationJson(value)}\n`, "utf8")
    await handle.sync()
  } finally {
    await handle.close()
  }
}

export const runRomanianCatalogSourceCli = async (
  args: readonly string[] = process.argv.slice(2)
) => {
  const options = parseOptions(args)
  const [
    catalogEntities,
    inventoryEnvelope,
    mergedCategories,
    mergedProducts,
    rawLiveInventory,
  ] = await Promise.all([
    readFile(options.catalogEntities),
    readFile(options.inventoryEnvelope),
    readFile(options.mergedCategories),
    readFile(options.mergedProducts),
    readFile(options.rawLiveInventory),
  ])
  const bundle = buildRomanianCatalogSourceBundle(
    {
      attestationOutputPath: options.attestationOutput,
      catalogEntities,
      inventoryEnvelope,
      mergedCategories,
      mergedProducts,
      rawLiveInventory,
      sourcePaths: {
        catalogEntities: options.catalogEntities,
        inventoryEnvelope: options.inventoryEnvelope,
        mergedCategories: options.mergedCategories,
        mergedProducts: options.mergedProducts,
        rawLiveInventory: options.rawLiveInventory,
      },
    },
    {
      databaseInstanceFingerprint: options.databaseInstanceFingerprint,
      environmentId: options.environmentId,
      kind: "test",
    }
  )
  await writeNewCanonicalJson(options.attestationOutput, bundle.attestation)
  await writeNewCanonicalJson(options.manifestOutput, bundle.manifest)
  await writeNewCanonicalJson(options.preimagesOutput, bundle.preimages)
  await writeNewCanonicalJson(options.authorityOutput, bundle.authority)
  return bundle.authority
}
