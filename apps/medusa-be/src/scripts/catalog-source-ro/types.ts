import type {
  CatalogTranslationInput,
  CatalogTranslationReference,
} from "../catalog-translation-pipeline/types"

export type RomanianCatalogSourceContract = Readonly<{
  evidenceProducts: Readonly<{
    excluded: number
    published: number
    total: number
  }>
  inventory: Readonly<{
    brands: number
    categories: number
    productContents: number
    products: number
  }>
  partitions: Readonly<{
    brands: Readonly<{ excluded: number; published: number; total: number }>
    categories: Readonly<{
      excluded: number
      published: number
      total: number
    }>
    products: Readonly<{ excluded: number; published: number; total: number }>
  }>
}>

export const ROMANIAN_CATALOG_SOURCE_CONTRACT: RomanianCatalogSourceContract = {
  evidenceProducts: { excluded: 97, published: 2002, total: 2099 },
  inventory: {
    brands: 128,
    categories: 209,
    productContents: 2151,
    products: 2151,
  },
  partitions: {
    brands: { excluded: 25, published: 103, total: 128 },
    categories: { excluded: 2, published: 207, total: 209 },
    products: { excluded: 149, published: 2002, total: 2151 },
  },
}

export type RomanianCatalogSourceEnvironment =
  CatalogTranslationInput["environment"]

export type RomanianCatalogSourceFiles = Readonly<{
  catalogEntities: Uint8Array
  inventoryEnvelope: Uint8Array
  mergedCategories: Uint8Array
  mergedProducts: Uint8Array
  rawLiveInventory: Uint8Array
  sourcePaths: Readonly<{
    catalogEntities: string
    inventoryEnvelope: string
    mergedCategories: string
    mergedProducts: string
    rawLiveInventory: string
  }>
}>

export type RomanianCatalogSourcePreimage = Readonly<{
  reference: CatalogTranslationReference
  referenceId: string
  sourceRecordSha256: string
  values: Readonly<Record<string, unknown>>
}>

export type RomanianCatalogSourceAuthority = Readonly<{
  inventory: RomanianCatalogSourceContract["inventory"]
  localeCode: "ro-RO"
  manifestSha256: string
  partitions: Readonly<{
    brands: Readonly<{
      excludedIds: readonly string[]
      publishedIds: readonly string[]
    }>
    categories: Readonly<{
      excludedIds: readonly string[]
      publishedIds: readonly string[]
    }>
    products: Readonly<{
      excludedIds: readonly string[]
      publishedIds: readonly string[]
    }>
  }>
  preimagesSha256: string
  schemaVersion: 1
  sourceArtifacts: Readonly<{
    catalogEntitiesSha256: string
    inventoryEnvelopeSha256: string
    mergedCategoriesSha256: string
    mergedProductsSha256: string
    rawLiveInventorySha256: string
  }>
  sourceLocale: "sk-SK"
}>

export type RomanianCatalogSourceBundle = Readonly<{
  authority: RomanianCatalogSourceAuthority
  manifest: CatalogTranslationInput
  preimages: readonly RomanianCatalogSourcePreimage[]
}>
