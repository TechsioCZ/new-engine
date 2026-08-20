export const RO_CATALOG_LOCALE = "ro-RO" as const
export const RO_CATALOG_MARKET = "ro" as const

export type RoCatalogStateFingerprint = Readonly<{
  count: number
  sha256: string
}>

export type RoCatalogSkStateProof = RoCatalogStateFingerprint &
  Readonly<{ errors: readonly string[] }>

export type RoCatalogSkProtectionAudit = Readonly<{
  baseline: RoCatalogStateFingerprint
  issues: readonly Readonly<{
    code: string
    entityId?: string
    entityKind:
      | "brand"
      | "catalog"
      | "category"
      | "collection"
      | "price"
      | "product"
      | "region"
    message: string
    severity: "error" | "warning"
  }>[]
  publication: Readonly<{
    brands: number
    categories: number
    collections: number
    errors: number
    products: number
  }>
  sharedInventoryBaseline: RoCatalogStateFingerprint
}>

export type RoCatalogPostCommerceInventoryEvidence = Readonly<{
  capturedAt: string
  commerceApplyReceiptSha256: string
  commercePlanFileSha256: string
  commercePlanHash: string
  commerceRestoreArtifactSha256: string
  environment: Readonly<{
    backendBuildHash: string
    backendDeploymentId: string
    backendReleaseSha: string
    backendSlot: "blue" | "green"
    databaseFingerprint: string
    environmentId: string
    locale: typeof RO_CATALOG_LOCALE
    marketCode: typeof RO_CATALOG_MARKET
    salesChannelId: string
  }>
  kind: "ro-demo-post-commerce-envelope"
  observedCommerceSnapshotSha256: string
  payloadSha256: string
  postCommerceEnvelopeSha256: string
  postCommerceSharedInventoryFingerprint: RoCatalogStateFingerprint
  postCommerceSkBaseline: RoCatalogSkStateProof
  preCommerceSharedInventoryFingerprint: RoCatalogStateFingerprint
  preCommerceSkBaseline: RoCatalogSkStateProof
  priceAuthoritySha256: string
  rawLiveInventorySha256: string
  schemaVersion: 1
  sourceInventoryEnvelopeSha256: string
}>

export type RoCatalogProductKey = Readonly<{
  kind: "ean" | "external_id" | "medusa_id" | "sku"
  value: string
}>

export type RoCatalogCategoryKey = Readonly<{
  kind: "medusa_id" | "source_category_id" | "source_guid"
  value: string
}>

export type RoCatalogSourceEvidence = Readonly<{
  contentSha256: string
  retrievedAt: string
  url: string
}>

export type RoCatalogProductEntry = Readonly<{
  key: RoCatalogProductKey
  productContent: Readonly<{
    composition: string
    other: string
    usage: string
    warning: string
  }>
  publicSlug: string
  publicationStatus: "draft" | "published"
  source: RoCatalogSourceEvidence
  translation: Readonly<{
    description: string
    subtitle?: null | string
    title: string
  }>
  variants: readonly Readonly<{
    key: Readonly<{ kind: "ean" | "sku"; value: string }>
    roAvailability: "sellable" | "unavailable"
    ronPrice?: Readonly<{
      amount: number
      approval: Readonly<{
        approvedAt: string
        approvedBy: string
        reference: string
      }>
      currencyCode: "ron"
    }>
  }>[]
}>

export type RoCatalogExcludedProductEntry = Readonly<{
  decision: Readonly<{
    approvedAt: string
    approvedBy: string
    reference: string
  }>
  key: RoCatalogProductKey
  reason: string
  source: RoCatalogSourceEvidence
}>

export type RoCatalogExcludedCategoryEntry = Readonly<{
  decision: Readonly<{
    approvedAt: string
    approvedBy: string
    reference: string
  }>
  key: RoCatalogCategoryKey
  reason: string
  source: RoCatalogSourceEvidence
  translation: RoCatalogCategoryEntry["translation"]
}>

export type RoCatalogCategoryEntry = Readonly<{
  expectedDirectChildCount: number
  expectedDirectProductCount: number
  key: RoCatalogCategoryKey
  parentKey: RoCatalogCategoryKey | null
  publicSlug: string
  publicationStatus: "draft" | "published"
  salesChannelId: string
  source: RoCatalogSourceEvidence
  translation: Readonly<{
    bottom_description_html: null | string
    description: null | string
    meta_description: null | string
    meta_title: null | string
    name: string
    top_description_html: null | string
  }>
}>

export type RoCatalogCategoryInventory = Readonly<{
  activeCount: number
  rootCount: number
}>

export type RoCatalogBrandEntry = Readonly<{
  key: Readonly<{ kind: "medusa_id"; value: string }>
  publicationStatus: "draft" | "published"
  publicSlug: string
  salesChannelId: string
  source: RoCatalogSourceEvidence
  translation: Readonly<{ title: string }>
}>

export type RoCatalogExcludedBrandEntry = Readonly<{
  decision: Readonly<{
    approvedAt: string
    approvedBy: string
    reference: string
  }>
  key: Readonly<{ kind: "medusa_id"; value: string }>
  reason: string
  source: RoCatalogSourceEvidence
}>

export type RoCatalogReadinessRequirements = Readonly<{
  currencyCode: "ron"
  paymentProviderIds: readonly string[]
  regionId: string
  shippingOptionIds: readonly string[]
  taxRegionIds: readonly string[]
}>

export type RoCatalogManifest = Readonly<{
  brandInventory: Readonly<{ count: number }>
  brands: readonly RoCatalogBrandEntry[]
  categories: readonly RoCatalogCategoryEntry[]
  categoryInventory?: RoCatalogCategoryInventory
  collectionInventory: Readonly<{ count: 0 }>
  excludedBrands: readonly RoCatalogExcludedBrandEntry[]
  excludedCategories: readonly RoCatalogExcludedCategoryEntry[]
  excludedProducts: readonly RoCatalogExcludedProductEntry[]
  locale: typeof RO_CATALOG_LOCALE
  market: typeof RO_CATALOG_MARKET
  omissionMode?: "official-ro-description-only"
  postCommerceInventoryEvidence: RoCatalogPostCommerceInventoryEvidence
  products: readonly RoCatalogProductEntry[]
  readiness: RoCatalogReadinessRequirements
  schemaVersion: 1
}>

export type RoCatalogCliOptions = Readonly<{
  apply: boolean
  chunkSize: number
  confirmPlanHash?: string
  generationPlanPath: string
  manifestPath: string
  omissionLedgerOutputPath?: string
  planOutputPath: string
  postCommerceEnvelopePath: string
  salesChannelId?: string
}>

export type RoCatalogGenerationProof = Readonly<{
  generationPlanSha256: string
  inputSha256: string
  manifestSha256: string
}>

export type RoCatalogOmissionLedger = Readonly<{
  entries: readonly Readonly<{
    omittedFields: readonly ["usage", "composition", "warning", "other"]
    productContentId: string
    productId: string
    roDescriptionSha256: string
    sourceContentSha256: string
    sourceUrl: string
  }>[]
  mode: "official-ro-description-only"
  schemaVersion: 1
}>

export type ExistingTranslation = Readonly<{
  id: string
  localeCode: string
  reference: "brand" | "product" | "product_category" | "product_content"
  referenceId: string
  translations: Readonly<Record<string, unknown>>
}>

export type CatalogCategorySnapshot = Readonly<{
  description: null | string
  directProductIds: readonly string[]
  id: string
  isActive: boolean
  metadata: Readonly<Record<string, unknown>>
  name: string
  parentId: null | string
}>

export type CatalogBrandSnapshot = Readonly<{ id: string; title: string }>

export type CategoryUrlAssignmentSnapshot = Readonly<{
  entityId: string
  id: string
  marketCode: string
  publicationStatus: string
  publicSlug: string
  salesChannelId: string
  sourceVersion: number
  updatedAt: string
}>

export type ExistingProductContent = Readonly<{
  composition: string
  id: string
  other: string
  productId: string
  usage: string
  warning: string
}>

export type CatalogProductSnapshot = Readonly<{
  categoryIds: readonly string[]
  description: null | string
  externalId: null | string
  id: string
  metadata: Readonly<Record<string, unknown>>
  salesChannelIds: readonly string[]
  sourceContent: RoCatalogProductEntry["productContent"]
  status: string
  title: string
  variants: readonly Readonly<{
    ean: null | string
    id: string
    prices: readonly Readonly<{ amount: number; currencyCode: string }>[]
    sku: null | string
  }>[]
}>

export type RoCommerceReadinessSnapshot = Readonly<{
  paymentProviders: readonly Readonly<{
    enabled: boolean
    id: string
    regionIds: readonly string[]
  }>[]
  regions: readonly Readonly<{
    countryCodes: readonly string[]
    currencyCode: string
    id: string
  }>[]
  shippingOptions: readonly Readonly<{
    countryCodes: readonly string[]
    id: string
  }>[]
  taxRegions: readonly Readonly<{
    countryCode: string
    id: string
  }>[]
}>

export type RoCatalogSnapshot = Readonly<{
  brandAssignments: readonly CategoryUrlAssignmentSnapshot[]
  brands: readonly CatalogBrandSnapshot[]
  categories: readonly CatalogCategorySnapshot[]
  categoryAssignments: readonly CategoryUrlAssignmentSnapshot[]
  commerceReadiness: RoCommerceReadinessSnapshot
  collectionIds: readonly string[]
  contents: readonly ExistingProductContent[]
  products: readonly CatalogProductSnapshot[]
  salesChannels: readonly Readonly<{
    id: string
    metadata: Readonly<Record<string, unknown>> | null
  }>[]
  skProtection: RoCatalogSkProtectionAudit
  translations: readonly ExistingTranslation[]
}>

export type TranslationMutation = Readonly<{
  action: "create" | "unchanged" | "update"
  existingId?: string
  previousTranslations?: Readonly<Record<string, unknown>>
  reference: "brand" | "product" | "product_category" | "product_content"
  referenceId?: string
  translations: Readonly<Record<string, unknown>>
}>

export type RoCatalogImportPlanItem = Readonly<{
  content: Readonly<{
    action: "create" | "unchanged"
    baseValues: RoCatalogProductEntry["productContent"]
    existingId?: string
    translation: TranslationMutation
  }>
  entry: RoCatalogProductEntry
  productId: string
  productTranslation: TranslationMutation
  publication: Readonly<{
    action: "unchanged" | "update"
    previousRoAssignment: unknown
    salesChannelId: string
  }>
  variantAuthorityEntries: readonly Readonly<{
    approvalProvenance: Readonly<Record<string, unknown>>
    availability: "sellable" | "unavailable"
    sourceProvenance: Readonly<Record<string, unknown>>
    variantId: string
  }>[]
}>

export type RoCatalogCategoryPlanItem = Readonly<{
  assignment: Readonly<{
    action: "create" | "unchanged" | "update"
    nextSourceVersion: number
    previous: CategoryUrlAssignmentSnapshot | null
  }>
  categoryId: string
  entry: RoCatalogCategoryEntry
  translation: TranslationMutation
}>

export type RoCatalogBrandPlanItem = Readonly<{
  assignment: Readonly<{
    action: "create" | "unchanged" | "update"
    nextSourceVersion: number
    previous: CategoryUrlAssignmentSnapshot | null
  }>
  brandId: string
  entry: RoCatalogBrandEntry
  translation: TranslationMutation
}>

export type RoCatalogExcludedProductPlanItem = Readonly<{
  action: "draft" | "unchanged"
  entry: RoCatalogExcludedProductEntry
  previousRoAssignment: unknown
  productId: string
}>

export type RoCatalogExcludedCategoryPlanItem = Readonly<{
  action: "draft" | "unchanged"
  categoryId: string
  entry: RoCatalogExcludedCategoryEntry
  nextSourceVersion: number
  previous: CategoryUrlAssignmentSnapshot | null
  translation: TranslationMutation
}>

export type RoCatalogExcludedBrandPlanItem = Readonly<{
  action: "draft" | "unchanged"
  brandId: string
  entry: RoCatalogExcludedBrandEntry
  nextSourceVersion: number
  previous: CategoryUrlAssignmentSnapshot | null
}>

export type RoCatalogImportPlan = Readonly<{
  brandItems: readonly RoCatalogBrandPlanItem[]
  categoryItems: readonly RoCatalogCategoryPlanItem[]
  excludedCategoryItems: readonly RoCatalogExcludedCategoryPlanItem[]
  excludedBrandItems: readonly RoCatalogExcludedBrandPlanItem[]
  excludedItems: readonly RoCatalogExcludedProductPlanItem[]
  generationProof: RoCatalogGenerationProof | null
  items: readonly RoCatalogImportPlanItem[]
  omissionLedger: null | RoCatalogOmissionLedger
  omissionLedgerSha256: null | string
  postCommerceInventoryEvidence: RoCatalogPostCommerceInventoryEvidence
  scope: Readonly<{
    brandIds: readonly string[]
    brandExcludedIds: readonly string[]
    categoryExcludedIds: readonly string[]
    categoryPublishedIds: readonly string[]
    collectionIds: readonly string[]
    productExcludedIds: readonly string[]
    productPublishedIds: readonly string[]
  }>
  scopeSha256: string
  expectedSkBaseline: RoCatalogStateFingerprint
  expectedSkIssues: RoCatalogSkProtectionAudit["issues"]
  expectedSkPublication: RoCatalogSkProtectionAudit["publication"]
  expectedSharedInventoryBaseline: RoCatalogStateFingerprint
  summary: Readonly<{
    brandAssignmentsToCreate: number
    brandAssignmentsToUpdate: number
    brands: number
    brandTranslationsToCreate: number
    brandTranslationsToUpdate: number
    brandExclusionsToDraft: number
    categories: number
    categoryAssignmentsToCreate: number
    categoryAssignmentsToUpdate: number
    categoryTranslationsToCreate: number
    categoryTranslationsToUpdate: number
    unchangedCategoryAssignments: number
    unchangedCategoryTranslations: number
    contentRecordsToCreate: number
    excludedCategories: number
    excludedBrands: number
    excludedCategoryTranslationsToCreate: number
    excludedCategoryTranslationsToUpdate: number
    categoryExclusionsToDraft: number
    excludedProducts: number
    exclusionsToDraft: number
    products: number
    publicationsToUpdate: number
    translationsToCreate: number
    translationsToUpdate: number
    unchangedTranslations: number
  }>
}>
