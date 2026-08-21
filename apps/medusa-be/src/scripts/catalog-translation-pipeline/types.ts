export const CATALOG_TRANSLATION_SOURCE_LOCALE = "sk-SK" as const

export const CATALOG_TRANSLATION_TARGET_LOCALES = [
  "cs-CZ",
  "hu-HU",
  "ro-RO",
] as const

export const CATALOG_TRANSLATION_EXACT_INVENTORY = {
  brands: 128,
  categories: 209,
  productContents: 2151,
  products: 2151,
} as const

export type CatalogTranslationTargetLocale =
  (typeof CATALOG_TRANSLATION_TARGET_LOCALES)[number]

export type CatalogTranslationLocale =
  | CatalogTranslationTargetLocale
  | typeof CATALOG_TRANSLATION_SOURCE_LOCALE

export type CatalogTranslationMode = "normalize-source" | "replace"

export type CatalogTranslationReference =
  | "brand"
  | "product"
  | "product_category"
  | "product_content"

export type CatalogTranslationProvenance = Readonly<{
  artifactSha256: string
  method: "ai-generated" | "canonical-source" | "existing-reviewed-artifact"
  sourceReference: string
}>

export type CatalogTranslationInputEntry = Readonly<{
  localeCode: CatalogTranslationLocale
  provenance: CatalogTranslationProvenance
  reference: CatalogTranslationReference
  referenceId: string
  translations: Readonly<Record<string, string | null>>
}>

export type CatalogTranslationInput = Readonly<{
  entries: readonly CatalogTranslationInputEntry[]
  environment: Readonly<{
    databaseInstanceFingerprint: string
    environmentId: string
    kind: "test"
  }>
  inventory: Readonly<{
    brands: number
    categories: number
    productContents: number
    products: number
  }>
  mode: CatalogTranslationMode
  schemaVersion: 1
  sourceLocale: typeof CATALOG_TRANSLATION_SOURCE_LOCALE
  sourceArtifacts: readonly Readonly<{ path: string; sha256: string }>[]
  targetLocale: CatalogTranslationLocale
}>

export type ExistingCatalogTranslation = Readonly<{
  id: string
  localeCode: string
  reference: CatalogTranslationReference
  referenceId: string
  translations: Readonly<Record<string, unknown>>
}>

export type CatalogTranslationPlanItem = Readonly<{
  action: "create" | "unchanged" | "update"
  desiredTranslations: Readonly<Record<string, string | null>>
  existingId?: string
  localeCode: CatalogTranslationLocale
  previousTranslations: Readonly<Record<string, unknown>> | null
  provenance: CatalogTranslationProvenance
  reference: CatalogTranslationReference
  referenceId: string
  resultingTranslations: Readonly<Record<string, unknown>>
  sourceRecordSha256: string
}>

export type CatalogTranslationProtectedState = Readonly<{
  databaseStateSha256: string
  entityIdentitySha256: string
  sharedInventory: Readonly<{ count: number; sha256: string }>
  sourceStateSha256: string
}>

export type CatalogTranslationPlan = Readonly<{
  environment: CatalogTranslationInput["environment"]
  inputSha256: string
  items: readonly CatalogTranslationPlanItem[]
  protectedState: CatalogTranslationProtectedState
  mode: CatalogTranslationMode
  schemaVersion: 1
  scope: Readonly<{
    brandIds: readonly string[]
    categoryIds: readonly string[]
    productContentIds: readonly string[]
    productIds: readonly string[]
    targetLocales: readonly CatalogTranslationLocale[]
  }>
  scopeSha256: string
  sourceLocale: typeof CATALOG_TRANSLATION_SOURCE_LOCALE
  summary: Readonly<{
    creates: number
    entries: number
    unchanged: number
    updates: number
  }>
}>

export type CatalogTranslationPlanArtifact = Readonly<{
  plan: CatalogTranslationPlan
  planHash: string
  schemaVersion: 1
}>

export type CatalogTranslationApplyReceipt = Readonly<{
  appliedAt: string
  environment: CatalogTranslationInput["environment"]
  payloadSha256: string
  planHash: string
  protectedState: CatalogTranslationProtectedState
  rollbackArtifactSha256: string
  schemaVersion: 1
  scopeSha256: string
  summary: CatalogTranslationPlan["summary"]
  targetStateSha256: string
}>

export type CatalogTranslationRollbackArtifact = Readonly<{
  createdAt: string
  environment: CatalogTranslationInput["environment"]
  items: readonly Readonly<{
    existingId?: string
    localeCode: CatalogTranslationLocale
    previousTranslations: Readonly<Record<string, unknown>> | null
    reference: CatalogTranslationReference
    referenceId: string
    resultingTranslations: Readonly<Record<string, unknown>>
  }>[]
  planHash: string
  protectedState: CatalogTranslationProtectedState
  schemaVersion: 1
  scopeSha256: string
}>

export type CatalogTranslationCliOptions = Readonly<{
  apply: boolean
  chunkSize: number
  confirmPlanHash?: string
  inputPath: string
  planOutputPath: string
  receiptOutputPath?: string
  rollbackOutputPath?: string
}>

export type CatalogTranslationSourceGeneratorCliOptions = Readonly<{
  inputOutputPath: string
  sourceOutputPath: string
}>
