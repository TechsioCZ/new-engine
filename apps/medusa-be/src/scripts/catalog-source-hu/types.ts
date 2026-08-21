import type {
  CatalogTranslationInput,
  CatalogTranslationProvenance,
  CatalogTranslationReference,
} from "../catalog-translation-pipeline/types"

export type HungarianCatalogSourceContract =
  CatalogTranslationInput["inventory"]

export const HUNGARIAN_CATALOG_SOURCE_CONTRACT: HungarianCatalogSourceContract =
  {
    brands: 128,
    categories: 209,
    productContents: 2151,
    products: 2151,
  }

export type HungarianCatalogSourceEnvironment =
  CatalogTranslationInput["environment"]

export type HungarianCatalogSourceFiles = Readonly<{
  attestationOutputPath: string
  canonicalSourceManifest: Uint8Array
  hungarianTranslations: Uint8Array
  sourcePaths: Readonly<{
    canonicalSourceManifest: string
    hungarianTranslations: string
  }>
}>

export type HungarianCatalogTranslationRow = Readonly<{
  localeCode: "hu-HU"
  method: Exclude<CatalogTranslationProvenance["method"], "canonical-source">
  reference: CatalogTranslationReference
  referenceId: string
  sourceReference: string
  translations: Readonly<Record<string, string | null>>
}>

export type HungarianCatalogSourcePreimage = Readonly<{
  reference: CatalogTranslationReference
  referenceId: string
  sourceRecordSha256: string
  values: Readonly<Record<string, string | null>>
}>

export type HungarianCatalogSourceLedgerRow = Readonly<{
  localeCode: "hu-HU"
  method: HungarianCatalogTranslationRow["method"]
  reference: CatalogTranslationReference
  referenceId: string
  sourceRecordSha256: string
  sourceReference: string
  translationRecordSha256: string
}>

export type HungarianCatalogSemanticAttestation = Readonly<{
  records: readonly Readonly<{
    reference: CatalogTranslationReference
    referenceId: string
    sourceReference: string
    translations: Readonly<Record<string, string | null>>
  }>[]
  schemaVersion: 1
}>

export type HungarianCatalogSourceAuthority = Readonly<{
  inventory: HungarianCatalogSourceContract
  ledgerSha256: string
  localeCode: "hu-HU"
  manifestSha256: string
  preimagesSha256: string
  records: Readonly<{
    aiGenerated: number
    existingReviewedArtifact: number
    total: number
  }>
  schemaVersion: 1
  semanticAttestation: Readonly<{
    path: string
    records: number
    sha256: string
  }>
  sourceArtifacts: Readonly<{
    canonicalSourceManifestSha256: string
    hungarianTranslationsSha256: string
  }>
  sourceLocale: "sk-SK"
}>

export type HungarianCatalogSourceBundle = Readonly<{
  attestation: HungarianCatalogSemanticAttestation
  authority: HungarianCatalogSourceAuthority
  ledger: readonly HungarianCatalogSourceLedgerRow[]
  manifest: CatalogTranslationInput
  preimages: readonly HungarianCatalogSourcePreimage[]
}>
