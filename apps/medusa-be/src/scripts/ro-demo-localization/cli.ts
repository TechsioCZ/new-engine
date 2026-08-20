import { createHash } from "node:crypto"
import {
  access,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import { parseDemoCatalogEntitiesJson } from "./catalog-entities"
import { buildRomanianDemoLocalization } from "./generator"
import { parseMergedDemoCategoryJsonl } from "./merged-categories"
import { parseMergedDemoProductJsonl } from "./merged-source"
import { parsePostCommerceEnvelope } from "./postcommerce-envelope"
import type { DemoLocalizationFileInput } from "./types"

const SHA_256 = /^[a-f0-9]{64}$/

export type DemoLocalizationCliOptions = Readonly<{
  catalogEntitiesPath: string
  categorySourcePath: string
  mergedProductsPath: string
  outputDirectoryPath: string
  postCommerceEnvelopePath: string
  postCommerceEnvelopeSha256: string
}>

const requireValue = (argv: readonly string[], index: number, flag: string) => {
  const value = argv[index + 1]
  if (!(value && !value.startsWith("--"))) {
    throw new Error(`${flag} requires a file path`)
  }
  return value
}

export const parseDemoLocalizationCliOptions = (
  argv: readonly string[]
): DemoLocalizationCliOptions => {
  const values = new Map<string, string>()
  const allowed = new Set([
    "--catalog-entities",
    "--category-source",
    "--merged-products",
    "--output-directory",
    "--post-commerce-envelope",
    "--post-commerce-envelope-sha256",
  ])
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    if (!(flag && allowed.has(flag))) {
      throw new Error(`Unknown option ${flag ?? "<missing>"}`)
    }
    if (values.has(flag)) {
      throw new Error(`Duplicate option ${flag}`)
    }
    values.set(flag, requireValue(argv, index, flag))
  }
  const missing = [...allowed].find((flag) => !values.has(flag))
  if (missing) {
    throw new Error(`Missing required option ${missing}`)
  }
  const options = {
    catalogEntitiesPath: resolve(values.get("--catalog-entities") as string),
    categorySourcePath: resolve(values.get("--category-source") as string),
    mergedProductsPath: resolve(values.get("--merged-products") as string),
    outputDirectoryPath: resolve(values.get("--output-directory") as string),
    postCommerceEnvelopePath: resolve(
      values.get("--post-commerce-envelope") as string
    ),
    postCommerceEnvelopeSha256: values.get(
      "--post-commerce-envelope-sha256"
    ) as string,
  }
  if (!SHA_256.test(options.postCommerceEnvelopeSha256)) {
    throw new Error(
      "--post-commerce-envelope-sha256 must be a lowercase SHA-256"
    )
  }
  return options
}

export const parseBoundPostCommerceEnvelope = (
  text: string,
  expectedSha256: string,
  options?: Parameters<typeof parsePostCommerceEnvelope>[1]
) => {
  if (!SHA_256.test(expectedSha256)) {
    throw new Error("Expected post-commerce envelope SHA-256 is invalid")
  }
  const observedSha256 = createHash("sha256").update(text).digest("hex")
  if (observedSha256 !== expectedSha256) {
    throw new Error(
      `Post-commerce envelope SHA-256 mismatch: expected ${expectedSha256}, observed ${observedSha256}`
    )
  }
  return {
    envelope: parsePostCommerceEnvelope(text, options),
    sha256: observedSha256,
  }
}

export const runDemoLocalizationCli = async (
  argv: readonly string[] = process.argv.slice(2)
) => {
  const options = parseDemoLocalizationCliOptions(argv)
  const [catalogEntitiesJson, categoryJsonl, postCommerceJson, mergedJsonl] =
    await Promise.all([
      readFile(options.catalogEntitiesPath, "utf8"),
      readFile(options.categorySourcePath, "utf8"),
      readFile(options.postCommerceEnvelopePath, "utf8"),
      readFile(options.mergedProductsPath, "utf8"),
    ])
  const boundPostCommerceEnvelope = parseBoundPostCommerceEnvelope(
    postCommerceJson,
    options.postCommerceEnvelopeSha256
  )
  const postCommerceEnvelope = boundPostCommerceEnvelope.envelope
  const fileInput: DemoLocalizationFileInput = postCommerceEnvelope.payload
  const { payload: _payload, ...postCommerceEvidence } = postCommerceEnvelope
  const { brandExclusionAuthority, mergedEvidenceCapturedAt, ...baseInput } =
    fileInput
  const catalogEntities = parseDemoCatalogEntitiesJson(
    catalogEntitiesJson,
    fileInput.fallbackSource,
    brandExclusionAuthority
  )
  const categorySource = parseMergedDemoCategoryJsonl(
    categoryJsonl,
    fileInput.fallbackSource
  )
  const inventoryExcludedCategoryIds = baseInput.inventory.categories
    .filter(({ roExclusionDecision }) => Boolean(roExclusionDecision))
    .map(({ key }) => key.value)
    .sort((left, right) => left.localeCompare(right, "en"))
  if (
    JSON.stringify(inventoryExcludedCategoryIds) !==
    JSON.stringify(categorySource.excludedMedusaIds)
  ) {
    throw new Error(
      "Inventory category exclusions do not exactly match frozen source authority"
    )
  }
  const bundle = buildRomanianDemoLocalization({
    ...baseInput,
    postCommerceInventoryEvidence: {
      ...postCommerceEvidence,
      postCommerceEnvelopeSha256: boundPostCommerceEnvelope.sha256,
    },
    inventory: { ...baseInput.inventory, brands: catalogEntities.brands },
    officialCategories: categorySource.categories,
    officialProducts: parseMergedDemoProductJsonl(
      mergedJsonl,
      mergedEvidenceCapturedAt
    ),
  })
  assertFinalDemoPartition(bundle)
  await writeDemoLocalizationArtifacts(options.outputDirectoryPath, bundle)
  return bundle
}

export const assertFinalDemoPartition = (
  bundle: ReturnType<typeof buildRomanianDemoLocalization>
) => {
  if (!bundle.bootstrap) {
    throw new Error("Final demo bundle is missing two-phase bootstrap binding")
  }
  const publishedVariants = bundle.manifest.products.flatMap(
    ({ variants }) => variants
  )
  const productsWithoutOneApprovedSellableVariant = bundle.manifest.products
    .filter(
      ({ variants }) =>
        variants.filter(
          ({ roAvailability, ronPrice }) =>
            roAvailability === "sellable" && Boolean(ronPrice)
        ).length !== 1
    )
    .map(({ key }) => `${key.kind}:${key.value}`)
  if (productsWithoutOneApprovedSellableVariant.length > 0) {
    throw new Error(
      `Published products do not each have exactly one approved sellable RON variant: ${productsWithoutOneApprovedSellableVariant.slice(0, 5).join(", ")}`
    )
  }
  const observed = {
    brandsExcluded: bundle.manifest.excludedBrands.length,
    brandsPublished: bundle.manifest.brands.length,
    categoriesExcluded: bundle.manifest.excludedCategories.length,
    categoriesPublished: bundle.manifest.categories.length,
    officialProductsExcluded: bundle.exclusions.officialProducts.length,
    productsExcluded: bundle.manifest.excludedProducts.length,
    productsPublished: bundle.manifest.products.length,
    sellableVariants: publishedVariants.filter(
      ({ roAvailability }) => roAvailability === "sellable"
    ).length,
    unavailableVariants: publishedVariants.filter(
      ({ roAvailability }) => roAvailability === "unavailable"
    ).length,
  }
  const expected = {
    brandsExcluded: 25,
    brandsPublished: 103,
    categoriesExcluded: 2,
    categoriesPublished: 207,
    officialProductsExcluded: 97,
    productsExcluded: 149,
    productsPublished: 2002,
    sellableVariants: 2002,
    unavailableVariants: 29,
  }
  if (JSON.stringify(observed) !== JSON.stringify(expected)) {
    throw new Error(
      `Final demo partition mismatch: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(observed)}`
    )
  }
}

export const writeDemoLocalizationArtifacts = async (
  outputDirectoryPath: string,
  bundle: ReturnType<typeof buildRomanianDemoLocalization>
) => {
  const artifacts = [
    ["bundle.json", bundle],
    ["manifest.json", bundle.manifest],
    ["omission-ledger.json", bundle.demoOmissionLedger],
  ] as const
  const outputExists = await access(outputDirectoryPath).then(
    () => true,
    () => false
  )
  if (outputExists) {
    throw new Error(`Output directory already exists: ${outputDirectoryPath}`)
  }
  const temporaryDirectory = await mkdtemp(
    join(dirname(outputDirectoryPath), `.${basename(outputDirectoryPath)}.tmp-`)
  )
  try {
    await Promise.all(
      artifacts.map(([filename, value]) =>
        writeFile(
          join(temporaryDirectory, filename),
          `${JSON.stringify(value, null, 2)}\n`,
          { encoding: "utf8", flag: "wx", flush: true }
        )
      )
    )
    await rename(temporaryDirectory, outputDirectoryPath)
  } catch (error) {
    await rm(temporaryDirectory, { force: true, recursive: true })
    throw error
  }
}

export default async function generateRomanianDemoLocalization() {
  return await runDemoLocalizationCli()
}
