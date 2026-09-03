import { createHash } from "node:crypto"
import { isAbsolute } from "node:path"
import {
  hashCatalogTranslationValue,
  stableCatalogTranslationJson,
} from "../catalog-translation-pipeline/canonical"
import type {
  CatalogTranslationInput,
  CatalogTranslationInputEntry,
  CatalogTranslationProvenance,
  CatalogTranslationReference,
} from "../catalog-translation-pipeline/types"
import {
  ROMANIAN_CATALOG_SOURCE_CONTRACT,
  type RomanianCatalogSemanticAttestation,
  type RomanianCatalogSourceAuthority,
  type RomanianCatalogSourceBundle,
  type RomanianCatalogSourceContract,
  type RomanianCatalogSourceEnvironment,
  type RomanianCatalogSourceFiles,
  type RomanianCatalogSourcePreimage,
} from "./types"

const LINE_BREAK = /\r?\n/
const SHA_256 = /^[a-f0-9]{64}$/

type JsonRecord = Record<string, unknown>

const record = (value: unknown, label: string): JsonRecord => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as JsonRecord
}

const array = (value: unknown, label: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value
}

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a nonblank string`)
  }
  return value.trim()
}

const nullableText = (value: unknown, label: string): string | null => {
  if (value === null || value === undefined || value === "") {
    return null
  }
  return text(value, label)
}

const json = (bytes: Uint8Array, label: string): unknown => {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"))
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${(error as Error).message}`)
  }
}

const jsonl = (bytes: Uint8Array, label: string): readonly JsonRecord[] =>
  Buffer.from(bytes)
    .toString("utf8")
    .split(LINE_BREAK)
    .flatMap((line, index) => {
      if (!line.trim()) {
        return []
      }
      try {
        return [record(JSON.parse(line), `${label} line ${index + 1}`)]
      } catch (error) {
        throw new Error(
          `${label} line ${index + 1} is invalid: ${(error as Error).message}`
        )
      }
    })

const bytesSha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex")

const sorted = (values: Iterable<string>): readonly string[] =>
  [...values].sort((left, right) => left.localeCompare(right, "en"))

const assertCount = (actual: number, expected: number, label: string) => {
  if (actual !== expected) {
    throw new Error(
      `${label} must contain ${expected} records; observed ${actual}`
    )
  }
}

const uniqueById = <Value extends Readonly<{ id: string }>>(
  values: readonly Value[],
  label: string
): ReadonlyMap<string, Value> => {
  const result = new Map<string, Value>()
  for (const value of values) {
    if (result.has(value.id)) {
      throw new Error(`${label} contains duplicate ID ${value.id}`)
    }
    result.set(value.id, value)
  }
  return result
}

const assertExactIds = (
  actual: Iterable<string>,
  expected: Iterable<string>,
  label: string
) => {
  const left = sorted(actual)
  const right = sorted(expected)
  if (
    left.length !== right.length ||
    left.some((value, index) => value !== right[index])
  ) {
    throw new Error(`${label} IDs do not match the canonical inventory`)
  }
}

type InventoryProduct = Readonly<{
  description: string | null
  id: string
  productContent: Readonly<{
    composition: string
    other: string
    usage: string
    warning: string
  }>
  productContentId: string
  subtitle: string | null
  title: string
}>

type InventoryCategory = Readonly<{
  description: string | null
  id: string
  metadata: Readonly<Record<string, unknown>>
  name: string
}>

type CatalogBrand = Readonly<{
  copySource: "agent-generated-unreviewed" | "official-ro"
  id: string
  published: boolean
  skTitle: string
  title: string
}>

type MergedProduct = Readonly<{
  description: string
  id: string
  shortDescription: string | null
  title: string
}>

type MergedCategory = Readonly<{
  id: string
  published: boolean
  translations: Readonly<{
    bottom_description_html: string | null
    description: string | null
    meta_description: string | null
    meta_title: string | null
    name: string
    top_description_html: string | null
  }>
}>

const stringValue = (value: unknown, label: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`)
  }
  return value
}

const readInventoryProducts = (value: unknown): readonly InventoryProduct[] => {
  const inventory = record(
    record(value, "inventory envelope").inventory,
    "inventory"
  )
  return array(inventory.products, "inventory.products").map(
    (candidate, index) => {
      const product = record(candidate, `inventory.products[${index}]`)
      const content = record(
        product.productContent,
        `inventory.products[${index}].productContent`
      )
      return {
        description: nullableText(
          product.description,
          `inventory.products[${index}].description`
        ),
        id: text(product.id, `inventory.products[${index}].id`),
        productContent: {
          composition: stringValue(
            content.composition,
            `inventory.products[${index}].productContent.composition`
          ),
          other: stringValue(
            content.other,
            `inventory.products[${index}].productContent.other`
          ),
          usage: stringValue(
            content.usage,
            `inventory.products[${index}].productContent.usage`
          ),
          warning: stringValue(
            content.warning,
            `inventory.products[${index}].productContent.warning`
          ),
        },
        productContentId: text(
          product.productContentId,
          `inventory.products[${index}].productContentId`
        ),
        subtitle: nullableText(
          product.subtitle,
          `inventory.products[${index}].subtitle`
        ),
        title: text(product.title, `inventory.products[${index}].title`),
      }
    }
  )
}

const readRawProductSubtitles = (
  value: unknown
): ReadonlyMap<string, string | null> => {
  const root = record(value, "raw live inventory")
  const rows = array(root.products, "raw live inventory.products").map(
    (candidate, index) => {
      const product = record(candidate, `raw products[${index}]`)
      return {
        id: text(product.id, `raw products[${index}].id`),
        subtitle: nullableText(
          product.subtitle,
          `raw products[${index}].subtitle`
        ),
      }
    }
  )
  return new Map(
    [...uniqueById(rows, "raw products")].map(([id, row]) => [id, row.subtitle])
  )
}

const readInventoryCategories = (
  rawValue: unknown,
  envelopeValue: unknown
): readonly InventoryCategory[] => {
  const rawRoot = record(rawValue, "raw live inventory")
  const metadataById = uniqueById(
    array(rawRoot.categories, "raw live inventory.categories").map(
      (candidate, index) => {
        const category = record(candidate, `raw categories[${index}]`)
        return {
          id: text(category.id, `raw categories[${index}].id`),
          metadata: record(
            category.metadata,
            `raw categories[${index}].metadata`
          ),
        }
      }
    ),
    "raw categories"
  )
  const envelopeRoot = record(envelopeValue, "inventory envelope")
  const inventory = record(
    envelopeRoot.inventory,
    "inventory envelope.inventory"
  )
  const categories = array(
    inventory.categories,
    "inventory envelope.inventory.categories"
  ).map((candidate, index) => {
    const category = record(candidate, `inventory categories[${index}]`)
    const key = record(category.key, `inventory categories[${index}].key`)
    const id = text(key.value, `inventory categories[${index}].key.value`)
    const source = metadataById.get(id)
    if (!source) {
      throw new Error(`inventory category ${id} lacks raw metadata`)
    }
    return {
      description: nullableText(
        category.description,
        `inventory categories[${index}].description`
      ),
      id,
      metadata: source.metadata,
      name: text(category.name, `inventory categories[${index}].name`),
    }
  })
  assertExactIds(
    categories.map(({ id }) => id),
    metadataById.keys(),
    "raw category"
  )
  return categories
}

const readCatalogBrands = (value: unknown): readonly CatalogBrand[] => {
  const root = record(value, "catalog entities")
  const brands = record(root.brands_by_medusa_id, "brands_by_medusa_id")
  return Object.entries(brands).map(([id, candidate]) => {
    const brand = record(candidate, `brand ${id}`)
    const candidateRo = record(brand.candidate_ro, `brand ${id}.candidate_ro`)
    const blue = record(brand.blue, `brand ${id}.blue`)
    const sk = record(blue.sk, `brand ${id}.blue.sk`)
    const copySource =
      record(brand.provenance, `brand ${id}.provenance`).title ===
      "official-herbatica-ro-brand-index"
        ? "official-ro"
        : "agent-generated-unreviewed"
    return {
      copySource,
      id,
      published: candidateRo.publishable === true,
      skTitle: text(sk.title, `brand ${id}.blue.sk.title`),
      title: text(candidateRo.title, `brand ${id}.candidate_ro.title`),
    }
  })
}

const readMergedProducts = (
  bytes: Uint8Array
): Readonly<{
  published: readonly MergedProduct[]
  officialExcluded: number
}> => {
  let officialExcluded = 0
  const published: MergedProduct[] = []
  for (const [index, row] of jsonl(bytes, "merged products").entries()) {
    const scope = record(row.demo_scope, `merged products[${index}].demo_scope`)
    if (scope.decision === "exclude-unreviewed") {
      officialExcluded += 1
      continue
    }
    if (
      scope.decision !== "publish-candidate" ||
      row.matchingStatus !== "matched"
    ) {
      throw new Error(`merged products[${index}] has an invalid decision`)
    }
    published.push({
      description: text(
        row.description_html,
        `merged products[${index}].description_html`
      ),
      id: text(
        row.medusaProductId,
        `merged products[${index}].medusaProductId`
      ),
      shortDescription: nullableText(
        row.short_description_html,
        `merged products[${index}].short_description_html`
      ),
      title: text(row.h1, `merged products[${index}].h1`),
    })
  }
  return { officialExcluded, published }
}

const readMergedCategories = (bytes: Uint8Array): readonly MergedCategory[] =>
  jsonl(bytes, "merged categories").map((row, index) => {
    const publication = record(
      row.publication,
      `merged categories[${index}].publication`
    )
    if (
      publication.status !== "publish-candidate" &&
      publication.status !== "excluded-ro-preserve-sk"
    ) {
      throw new Error(`merged categories[${index}] has an invalid decision`)
    }
    const translation = record(
      row.translation,
      `merged categories[${index}].translation`
    )
    return {
      id: text(row.medusa_id, `merged categories[${index}].medusa_id`),
      published: publication.status === "publish-candidate",
      translations: {
        bottom_description_html: nullableText(
          translation.bottom_description_html,
          `merged categories[${index}].translation.bottom_description_html`
        ),
        description: nullableText(
          translation.description,
          `merged categories[${index}].translation.description`
        ),
        meta_description: nullableText(
          translation.meta_description,
          `merged categories[${index}].translation.meta_description`
        ),
        meta_title: nullableText(
          translation.meta_title,
          `merged categories[${index}].translation.meta_title`
        ),
        name: text(
          translation.name,
          `merged categories[${index}].translation.name`
        ),
        top_description_html: nullableText(
          translation.top_description_html,
          `merged categories[${index}].translation.top_description_html`
        ),
      },
    }
  })

const provenance = (
  artifactSha256: string,
  method: CatalogTranslationProvenance["method"],
  sourceReference: string
): CatalogTranslationProvenance => ({
  artifactSha256,
  method,
  sourceReference,
})

const entry = (
  reference: CatalogTranslationReference,
  referenceId: string,
  translations: Readonly<Record<string, string | null>>,
  entryProvenance: CatalogTranslationProvenance
): CatalogTranslationInputEntry => ({
  localeCode: "ro-RO",
  provenance: entryProvenance,
  reference,
  referenceId,
  translations,
})

const preimage = (
  reference: CatalogTranslationReference,
  referenceId: string,
  values: Readonly<Record<string, unknown>>
): RomanianCatalogSourcePreimage => ({
  reference,
  referenceId,
  sourceRecordSha256: hashCatalogTranslationValue(values),
  values,
})

const neutralFallback = (ordinal: number) => ({
  description:
    "<p>Informațiile detaliate despre acest produs nu sunt disponibile momentan în limba română.</p>",
  subtitle:
    "<p>Traducerea în limba română este în curs de verificare editorială.</p>",
  title: `Produs Herbatica ${ordinal}`,
})

const validateEnvironment = (environment: RomanianCatalogSourceEnvironment) => {
  if (
    environment.kind !== "test" ||
    !environment.environmentId.trim() ||
    !SHA_256.test(environment.databaseInstanceFingerprint)
  ) {
    throw new Error("environment must identify an exact test database")
  }
}

const partitionIds = (
  values: readonly Readonly<{ id: string; published: boolean }>[]
) => ({
  excludedIds: sorted(
    values.flatMap(({ id, published }) => (published ? [] : [id]))
  ),
  publishedIds: sorted(
    values.flatMap(({ id, published }) => (published ? [id] : []))
  ),
})

const buildProductRecords = (
  products: ReadonlyMap<string, InventoryProduct>,
  officialProducts: ReadonlyMap<string, MergedProduct>,
  excludedProductIds: readonly string[],
  sourceArtifacts: RomanianCatalogSourceAuthority["sourceArtifacts"]
) => {
  const entries: CatalogTranslationInputEntry[] = []
  const preimages: RomanianCatalogSourcePreimage[] = []
  const excludedProductOrdinal = new Map(
    excludedProductIds.map((id, index) => [id, index + 1] as const)
  )
  for (const product of [...products.values()].sort((left, right) =>
    left.id.localeCompare(right.id, "en")
  )) {
    const official = officialProducts.get(product.id)
    entries.push(
      entry(
        "product",
        product.id,
        official
          ? {
              description: official.description,
              subtitle: official.shortDescription,
              title: official.title,
            }
          : neutralFallback(excludedProductOrdinal.get(product.id) as number),
        provenance(
          official
            ? sourceArtifacts.mergedProductsSha256
            : sourceArtifacts.inventoryEnvelopeSha256,
          official ? "existing-reviewed-artifact" : "ai-generated",
          official
            ? `merged/products.jsonl#medusaProductId=${product.id}`
            : `neutral-ro-fallback#productId=${product.id}`
        )
      ),
      entry(
        "product_content",
        product.productContentId,
        { composition: null, other: null, usage: null, warning: null },
        provenance(
          official
            ? sourceArtifacts.mergedProductsSha256
            : sourceArtifacts.inventoryEnvelopeSha256,
          official ? "existing-reviewed-artifact" : "ai-generated",
          official
            ? `official-ro-safety-omission#productId=${product.id}`
            : `neutral-ro-fallback#productContentId=${product.productContentId}`
        )
      )
    )
    preimages.push(
      preimage("product", product.id, {
        description: product.description,
        subtitle: product.subtitle,
        title: product.title,
      }),
      preimage(
        "product_content",
        product.productContentId,
        product.productContent
      )
    )
  }
  return { entries, preimages }
}

const buildCategoryRecords = (
  categories: ReadonlyMap<string, InventoryCategory>,
  translatedCategories: ReadonlyMap<string, MergedCategory>,
  artifactSha256: string
) => {
  const entries: CatalogTranslationInputEntry[] = []
  const preimages: RomanianCatalogSourcePreimage[] = []
  for (const category of [...translatedCategories.values()].sort(
    (left, right) => left.id.localeCompare(right.id, "en")
  )) {
    const source = categories.get(category.id) as InventoryCategory
    entries.push(
      entry(
        "product_category",
        category.id,
        category.translations,
        provenance(
          artifactSha256,
          "ai-generated",
          `merged/categories.jsonl#medusa_id=${category.id}`
        )
      )
    )
    preimages.push(
      preimage("product_category", category.id, {
        bottom_description_html:
          nullableText(
            source.metadata.bottom_description_html,
            "category bottom"
          ) ?? null,
        description: source.description,
        meta_description:
          nullableText(
            source.metadata.meta_description,
            "category meta description"
          ) ?? null,
        meta_title:
          nullableText(source.metadata.meta_title, "category meta title") ??
          null,
        name: source.name,
        top_description_html:
          nullableText(source.metadata.top_description_html, "category top") ??
          null,
      })
    )
  }
  return { entries, preimages }
}

const buildBrandRecords = (
  brands: ReadonlyMap<string, CatalogBrand>,
  artifactSha256: string
) => {
  const entries: CatalogTranslationInputEntry[] = []
  const preimages: RomanianCatalogSourcePreimage[] = []
  for (const brand of [...brands.values()].sort((left, right) =>
    left.id.localeCompare(right.id, "en")
  )) {
    entries.push(
      entry(
        "brand",
        brand.id,
        { title: brand.title },
        provenance(
          artifactSha256,
          brand.copySource === "official-ro"
            ? "existing-reviewed-artifact"
            : "ai-generated",
          `catalog-entities.json#brands_by_medusa_id.${brand.id}`
        )
      )
    )
    preimages.push(preimage("brand", brand.id, { title: brand.skTitle }))
  }
  return { entries, preimages }
}

export const buildRomanianCatalogSourceBundle = (
  files: RomanianCatalogSourceFiles,
  environment: RomanianCatalogSourceEnvironment,
  contract: RomanianCatalogSourceContract = ROMANIAN_CATALOG_SOURCE_CONTRACT
): RomanianCatalogSourceBundle => {
  validateEnvironment(environment)
  const sourceArtifacts = {
    catalogEntitiesSha256: bytesSha256(files.catalogEntities),
    inventoryEnvelopeSha256: bytesSha256(files.inventoryEnvelope),
    mergedCategoriesSha256: bytesSha256(files.mergedCategories),
    mergedProductsSha256: bytesSha256(files.mergedProducts),
    rawLiveInventorySha256: bytesSha256(files.rawLiveInventory),
  }
  for (const [name, path] of Object.entries(files.sourcePaths)) {
    if (!isAbsolute(path)) {
      throw new Error(`${name} source path must be absolute`)
    }
  }
  if (!isAbsolute(files.attestationOutputPath)) {
    throw new Error("semantic attestation output path must be absolute")
  }
  const inventoryEnvelope = json(files.inventoryEnvelope, "inventory envelope")
  const rawLiveInventory = json(files.rawLiveInventory, "raw live inventory")
  const inventoryProducts = readInventoryProducts(inventoryEnvelope)
  const rawProductSubtitles = readRawProductSubtitles(rawLiveInventory)
  assertExactIds(
    inventoryProducts.map(({ id }) => id),
    rawProductSubtitles.keys(),
    "raw product"
  )
  const products = inventoryProducts.map((product) => ({
    ...product,
    subtitle: rawProductSubtitles.get(product.id) ?? null,
  }))
  const categories = readInventoryCategories(
    rawLiveInventory,
    inventoryEnvelope
  )
  const brands = readCatalogBrands(
    json(files.catalogEntities, "catalog entities")
  )
  const mergedProducts = readMergedProducts(files.mergedProducts)
  const mergedCategories = readMergedCategories(files.mergedCategories)

  assertCount(products.length, contract.inventory.products, "products")
  assertCount(
    new Set(products.map(({ productContentId }) => productContentId)).size,
    contract.inventory.productContents,
    "product contents"
  )
  assertCount(categories.length, contract.inventory.categories, "categories")
  assertCount(brands.length, contract.inventory.brands, "brands")
  assertCount(
    mergedProducts.published.length,
    contract.partitions.products.published,
    "published merged products"
  )
  assertCount(
    mergedProducts.officialExcluded,
    contract.evidenceProducts.excluded,
    "excluded official rows"
  )
  assertCount(
    mergedProducts.published.length + mergedProducts.officialExcluded,
    contract.evidenceProducts.total,
    "official product evidence"
  )
  assertCount(
    mergedCategories.filter(({ published }) => published).length,
    contract.partitions.categories.published,
    "published categories"
  )
  assertCount(
    brands.filter(({ published }) => published).length,
    contract.partitions.brands.published,
    "published brands"
  )

  const productById = uniqueById(products, "products")
  const categoryById = uniqueById(categories, "categories")
  const brandById = uniqueById(brands, "brands")
  const mergedProductById = uniqueById(
    mergedProducts.published,
    "merged products"
  )
  const mergedCategoryById = uniqueById(mergedCategories, "merged categories")
  assertExactIds(mergedCategoryById.keys(), categoryById.keys(), "category")

  const productPartitions = {
    publishedIds: sorted(mergedProductById.keys()),
    excludedIds: sorted(
      products.flatMap(({ id }) => (mergedProductById.has(id) ? [] : [id]))
    ),
  }
  const categoryPartitions = partitionIds(mergedCategories)
  const brandPartitions = partitionIds(brands)
  assertCount(
    productPartitions.excludedIds.length,
    contract.partitions.products.excluded,
    "excluded inventory products"
  )
  assertCount(
    categoryPartitions.excludedIds.length,
    contract.partitions.categories.excluded,
    "excluded inventory categories"
  )
  assertCount(
    brandPartitions.excludedIds.length,
    contract.partitions.brands.excluded,
    "excluded inventory brands"
  )

  const productRecords = buildProductRecords(
    productById,
    mergedProductById,
    productPartitions.excludedIds,
    sourceArtifacts
  )
  const categoryRecords = buildCategoryRecords(
    categoryById,
    mergedCategoryById,
    sourceArtifacts.mergedCategoriesSha256
  )
  const brandRecords = buildBrandRecords(
    brandById,
    sourceArtifacts.catalogEntitiesSha256
  )
  const entries = [
    ...productRecords.entries,
    ...categoryRecords.entries,
    ...brandRecords.entries,
  ]
  const preimages = [
    ...productRecords.preimages,
    ...categoryRecords.preimages,
    ...brandRecords.preimages,
  ]

  entries.sort((left, right) =>
    `${left.reference}\u0000${left.referenceId}`.localeCompare(
      `${right.reference}\u0000${right.referenceId}`,
      "en"
    )
  )
  preimages.sort((left, right) =>
    `${left.reference}\u0000${left.referenceId}`.localeCompare(
      `${right.reference}\u0000${right.referenceId}`,
      "en"
    )
  )
  const attestation: RomanianCatalogSemanticAttestation = {
    records: entries.map(({ provenance: entryProvenance, ...item }) => ({
      reference: item.reference,
      referenceId: item.referenceId,
      sourceReference: entryProvenance.sourceReference,
      translations: item.translations,
    })),
    schemaVersion: 1,
  }
  const attestationSha256 = bytesSha256(
    Buffer.from(`${stableCatalogTranslationJson(attestation)}\n`)
  )
  const attestedEntries = entries.map((item) => ({
    ...item,
    provenance: {
      ...item.provenance,
      artifactSha256: attestationSha256,
    },
  }))
  const manifest: CatalogTranslationInput = {
    entries: attestedEntries,
    environment,
    inventory: contract.inventory,
    mode: "replace",
    schemaVersion: 1,
    sourceLocale: "sk-SK",
    sourceArtifacts: [
      { path: files.attestationOutputPath, sha256: attestationSha256 },
    ],
    targetLocale: "ro-RO",
  }
  const manifestSha256 = bytesSha256(
    Buffer.from(`${stableCatalogTranslationJson(manifest)}\n`)
  )
  const preimagesSha256 = hashCatalogTranslationValue(preimages)
  const authority: RomanianCatalogSourceAuthority = {
    inventory: contract.inventory,
    localeCode: "ro-RO",
    manifestSha256,
    partitions: {
      brands: {
        excludedIds: brandPartitions.excludedIds,
        publishedIds: brandPartitions.publishedIds,
      },
      categories: {
        excludedIds: categoryPartitions.excludedIds,
        publishedIds: categoryPartitions.publishedIds,
      },
      products: {
        excludedIds: productPartitions.excludedIds,
        publishedIds: productPartitions.publishedIds,
      },
    },
    preimagesSha256,
    schemaVersion: 1,
    semanticAttestation: {
      path: files.attestationOutputPath,
      records: attestation.records.length,
      sha256: attestationSha256,
    },
    sourceArtifacts,
    sourceLocale: "sk-SK",
  }
  return { attestation, authority, manifest, preimages }
}
