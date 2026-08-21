import type { CatalogTranslationInputEntry } from "../catalog-translation-pipeline/types"

export type CzechCatalogSourcePaths = Readonly<{
  brandsJsonl: string
  categoriesJsonl: string
  officialFeedXml: string
  officialPagesJsonl: string
  productsJsonl: string
  rawInventoryJson: string
}>

export type CzechCatalogEnvironment = Readonly<{
  databaseInstanceFingerprint: string
  environmentId: string
}>

export type CzechCatalogSourceLedgerRow = Readonly<{
  localeCode: "cs-CZ"
  method:
    | "official-explicit-brand-alias"
    | "official-exact-brand-slug"
    | "official-exact-unique-ean"
    | "temporary-ai-from-sk"
  reference: CatalogTranslationInputEntry["reference"]
  referenceId: string
  sourceArtifactSha256: string
  sourceRecordSha256: string
  sourceReference: string
}>

export type CzechCatalogBundleSummary = Readonly<{
  artifacts: Readonly<{
    inputSha256: string
    ledgerSha256: string
    sourceAttestationSha256: string
  }>
  counts: Readonly<{
    brands: Readonly<{
      officialExplicitAlias: number
      officialExactSlug: number
      temporaryAi: number
      total: number
    }>
    categories: Readonly<{ temporaryAi: number; total: number }>
    entries: number
    productContents: Readonly<{ temporaryAi: number; total: number }>
    products: Readonly<{
      officialFeedOnly: number
      officialExactUniqueEan: number
      officialPage: number
      temporaryAi: number
      total: number
    }>
  }>
  environment: CzechCatalogEnvironment
  kind: "herbatica-cz-test-catalog-translation-bundle"
  schemaVersion: 1
  sources: Readonly<{
    brandsJsonlSha256: string
    categoriesJsonlSha256: string
    officialFeedSha256: string
    officialPagesJsonlSha256: string
    productsJsonlSha256: string
    rawInventoryJsonSha256: string
  }>
}>
