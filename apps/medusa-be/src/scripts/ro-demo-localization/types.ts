import type {
  RoCatalogManifest,
  RoCatalogPostCommerceInventoryEvidence,
  RoCatalogReadinessRequirements,
  RoCatalogSourceEvidence,
} from "../ro-catalog-import/types"

export const DEMO_AUTHORIZATION = "demo-generated-unreviewed" as const

export type DemoCategoryKey = Readonly<{
  kind: "medusa_id"
  value: string
}>

export type DemoOfficialProduct = Readonly<{
  canonicalSlug?: null | string
  descriptions?: Readonly<{
    long?: Readonly<{ text: string }>
    short?: Readonly<{ text: string }>
  }>
  description?: null | string
  ean?: null | string
  matchingStatus?: "exact-bijective" | "excluded"
  medusaProductId?: string
  productContent?: Partial<
    Readonly<{
      composition: string
      other: string
      usage: string
      warning: string
    }>
  >
  publicSlug?: null | string
  sku?: null | string
  source: Readonly<{
    contentSha256?: string
    evidenceKind?: "merged-record" | "official-page"
    htmlSha256?: string
    retrievedAt: string
    url: string
  }>
  title?: null | string
}>

export type DemoOfficialCategory = Readonly<{
  copySource: "agent-generated-unreviewed" | "official-ro"
  key: DemoCategoryKey
  publicSlug?: null | string
  source: RoCatalogSourceEvidence
  translation?: Partial<
    Readonly<{
      bottom_description_html: null | string
      description: null | string
      meta_description: null | string
      meta_title: null | string
      name: string
      top_description_html: null | string
    }>
  >
}>

export type DemoInventoryProduct = Readonly<{
  description: null | string
  exclusionSource?: RoCatalogSourceEvidence
  externalId: null | string
  id: string
  productContentId: string
  roExclusionDecision?: Readonly<{
    approvedAt: string
    approvedBy: string
    reason: string
    reference: string
  }>
  productContent: Readonly<{
    composition: string
    other: string
    usage: string
    warning: string
  }>
  title: string
  variants: readonly Readonly<{
    ean: null | string
    ronPrice?: Readonly<{
      amount: number
      approval: Readonly<{
        approvedAt: string
        approvedBy: string
        reference: string
      }>
    }>
    sku: null | string
  }>[]
}>

export type DemoInventoryBrand = Readonly<{
  copySource: "agent-generated-unreviewed" | "official-ro"
  id: string
  publicSlug: string
  roExclusionDecision?: Readonly<{
    approvedAt: string
    approvedBy: string
    reason: string
    reference: string
  }>
  source: RoCatalogSourceEvidence
  title: string
}>

export type DemoInventoryCategory = Readonly<{
  description: null | string
  directChildCount: number
  directProductCount: number
  key: DemoCategoryKey
  name: string
  parentKey: DemoCategoryKey | null
  roExclusionDecision?: Readonly<{
    approvedAt: string
    approvedBy: string
    reason: string
    reference: string
  }>
}>

export type DemoLocalizationInput = Readonly<{
  fallbackSource: RoCatalogSourceEvidence
  generatedAt: string
  inventory: Readonly<{
    brands: readonly DemoInventoryBrand[]
    categories: readonly DemoInventoryCategory[]
    products: readonly DemoInventoryProduct[]
  }>
  officialCategories: readonly DemoOfficialCategory[]
  officialProducts: readonly DemoOfficialProduct[]
  postCommerceInventoryEvidence?: RoCatalogPostCommerceInventoryEvidence
  readiness: RoCatalogReadinessRequirements
  salesChannelId: string
}>

export type DemoBootstrapBinding = Readonly<{
  commercePlanSha256: string
  observedCommerceSnapshotSha256: string
  postCommerceEnvelopeSha256: string
  priceAuthoritySha256: string
  sourceInventoryEnvelopeSha256: string
}>

export type DemoLocalizationFileInput = Omit<
  DemoLocalizationInput,
  "officialCategories" | "officialProducts" | "postCommerceInventoryEvidence"
> &
  Readonly<{
    brandExclusionAuthority: Readonly<{
      approvedAt: string
      approvedBy: string
      referencePrefix: string
    }>
    mergedEvidenceCapturedAt: string
  }>

export type DemoFieldProvenance = Readonly<{
  fieldPath: string
  generated: boolean
  inputValueSha256?: string
  inputSha256: string
  outputValueSha256?: string
  recordKey: string
  source:
    | "agent-generated-unreviewed"
    | "carried-source-sk"
    | "demo-template"
    | "official-ro"
  warningCodes: readonly DemoWarningCode[]
}>

export type DemoWarningCode =
  | "carried-sk-safety-text"
  | "generated-category-copy"
  | "category-links-stripped"
  | "generated-product-copy"
  | "slug-collision-resolved"
  | "slug-normalized"
  | "unmatched-inventory-product-excluded"
  | "unsupported-official-safety-field"
  | "unreviewed-demo-content"

export type DemoLocalizationWarning = Readonly<{
  code: DemoWarningCode
  fieldPath: string
  message: string
  recordKey: string
}>

export type DemoOmissionLedger = Readonly<{
  entries: readonly Readonly<{
    omittedFields: readonly ("composition" | "other" | "usage" | "warning")[]
    productContentId: string
    productId: string
    roDescriptionSha256: string
    sourceContentSha256: string
    sourceUrl: string
  }>[]
  mode: "official-ro-description-only"
  schemaVersion: 1
}>

export type DemoExclusionLedger = Readonly<{
  inventoryProducts: readonly Readonly<{
    inputSha256: string
    productId: string
    reason: "no-bijective-official-identity"
    recordKey: string
  }>[]
  officialProducts: readonly Readonly<{
    ean: null | string
    reason: "ambiguous-or-unmatched-official-identity"
    sku: null | string
    sourceContentSha256: string
    sourceUrl: string
  }>[]
}>

export type DemoLocalizationBundle = Readonly<{
  authorization: typeof DEMO_AUTHORIZATION
  bootstrap: DemoBootstrapBinding | null
  coverage: Readonly<{
    generatedCategories: number
    agentGeneratedCategories: number
    generatedProducts: number
    inventoryCategories: number
    inventoryProducts: number
    matchedOfficialCategories: number
    matchedOfficialProducts: number
    officialCategories: number
    officialProducts: number
    sellableVariants: number
    unmatchedInventoryProducts: number
    unmatchedOfficialCategories: number
    unmatchedOfficialProducts: number
    unavailableVariants: number
  }>
  demoOmissionLedger: DemoOmissionLedger
  demoOmissionLedgerSha256: string
  exclusions: DemoExclusionLedger
  generatedAt: string
  generationPlanSha256: string
  inputSha256: string
  manifest: RoCatalogManifest
  manifestSha256: string
  provenance: readonly DemoFieldProvenance[]
  warnings: readonly DemoLocalizationWarning[]
}>

export type DemoOfficialJsonlRecord =
  | Readonly<{ category: DemoOfficialCategory; kind: "category" }>
  | Readonly<{ kind: "product"; product: DemoOfficialProduct }>
