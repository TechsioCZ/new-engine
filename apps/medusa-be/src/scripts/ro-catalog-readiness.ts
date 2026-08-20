import { createHash, randomUUID } from "node:crypto"
import {
  link as createHardLink,
  open,
  readFile,
  unlink,
} from "node:fs/promises"
import { extname, isAbsolute } from "node:path"
import type {
  ExecArgs,
  IFulfillmentModuleService,
  ITaxModuleService,
  ITranslationModuleService,
  Logger,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import {
  PRODUCT_PUBLICATION_METADATA_KEY,
  parseProductPublicationSnapshot,
} from "../modules/url-registry-outbox/product-publication-assignment"
import {
  hasRenderableVisibleContent,
  isCompleteCategoryPublicationTranslation,
  isCompleteProductContentPublicationTranslation,
  isCompleteProductPublicationTranslation,
} from "../utils/catalog-publication-predicate"
import { PRODUCT_CONTENT_TRANSLATABLE_FIELDS } from "../utils/product-content"
import {
  RO_DEMO_OMISSION_AUTHORITY_KEY,
  verifyRoDemoOmissionAuthority,
} from "../utils/ro-demo-omission-authority"
import {
  hashRoCatalogScopePlan,
  hashRoVariantAvailabilityExpectations,
  parseRoCatalogScopePlanArtifact,
  parseRoTwoPhaseProvenanceReceipt,
  type RoCatalogScopePlanArtifact,
  type RoVariantAvailabilityExpectation,
} from "./ro-catalog-readiness-contract"
import { buildRoDemoDatabaseInstanceFingerprint } from "./ro-demo-commerce/runtime"

export { parseRoCatalogReadinessReportArtifact } from "./ro-catalog-readiness-contract"

const RO_LOCALE = "ro-RO"
const SK_LOCALE = "sk-SK"
const RO_MARKET = "ro"
const RO_COUNTRY = "ro"
const RO_CURRENCY = "ron"
const PAGE_SIZE = 250
const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SHA256 = /^[a-f0-9]{64}$/
const HTML_TAG = /<[^>]*>/g
const HTML_ENTITY = /&(?:#\d+|#x[0-9a-f]+|[a-z]+);/gi
const CATEGORY_RICH_METADATA_FIELDS = [
  "top_description_html",
  "bottom_description_html",
  "meta_title",
  "meta_description",
] as const
const CATEGORY_LOCALIZED_CONTENT_FIELDS = [
  "description",
  ...CATEGORY_RICH_METADATA_FIELDS,
] as const

type UnknownRecord = Record<string, unknown>

export type RoCatalogAuditProduct = Readonly<{
  brand?: Readonly<{ id: string }> | null
  categories?: readonly Readonly<{ id: string }>[]
  collection_id?: string | null
  description?: string | null
  external_id?: string | null
  handle?: string | null
  id: string
  metadata?: unknown
  sales_channels: readonly Readonly<{ id: string }>[]
  subtitle?: string | null
  title: string
  updated_at: Date | string
  variants: readonly Readonly<{
    allow_backorder?: boolean | null
    ean?: string | null
    id: string
    manage_inventory?: boolean | null
    prices?: readonly Readonly<{
      amount?: number | null
      currency_code?: string | null
    }>[]
    sku?: string | null
    title?: string | null
  }>[]
}>

export type RoCatalogAuditCategory = Readonly<{
  description?: string | null
  handle?: string | null
  id: string
  is_active?: boolean | null
  metadata?: unknown
  name: string
  parent_category_id?: string | null
}>

export type RoCatalogAuditBrand = Readonly<{
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean | null
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
  handle?: string | null
  id: string
  title: string
}>

export type RoCatalogAuditCollection = Readonly<{
  handle?: string | null
  id: string
  metadata?: unknown
  title: string
}>

export type RoCatalogReviewedNeutralEquality = Readonly<{
  entityId: string
  entityKind: "brand" | "category" | "collection" | "product"
  field: string
  normalizedValue: string
  reason: string
  reference:
    | "brand"
    | "product"
    | "product_category"
    | "product_collection"
    | "product_content"
}>

/**
 * Intentionally empty until a human-reviewed language-neutral equality is
 * approved in code. Entries bind to the exact normalized value so a later
 * source-text change cannot inherit an old exception.
 */
export const REVIEWED_RO_NEUTRAL_EQUALITIES: readonly RoCatalogReviewedNeutralEquality[] =
  []

export const REVIEWED_RO_CATEGORY_EXCLUSIONS = [
  {
    id: "pcat_01KTA2V77E583E9W456C1JM295",
    reason:
      "Ghost duplicate has no distinct Romanian storefront identity; keep RO draft while preserving SK publication.",
  },
  {
    id: "pcat_01KTA2V77F0AGVY5GDYHW091ZH",
    reason:
      "Ghost duplicate has no distinct Romanian storefront identity; keep RO draft while preserving SK publication.",
  },
] as const
export const REVIEWED_RO_CATEGORY_AUTHORITY_SHA256 =
  "54ebd183e28141bc449c07fbdb68463db1e059e1a2508ba364dad31d6f5c753e" as const

export type RoCatalogAuditProductContent = Readonly<{
  composition?: string | null
  id: string
  other?: string | null
  product_id: string
  usage?: string | null
  warning?: string | null
}>

export type RoCatalogAuditTranslation = Readonly<{
  deleted_at?: Date | string | null
  id: string
  locale_code: string
  reference: string
  reference_id: string
  translations: Readonly<Record<string, unknown>>
}>

export type RoCatalogAuditAssignment = Readonly<{
  entity_id: string
  entity_kind: string
  market_code: string
  public_slug: string
  publication_status: string
  sales_channel_id: string
}>

export type RoCatalogAuditRegion = Readonly<{
  countries?: readonly Readonly<{ iso_2?: string | null }>[]
  currency_code?: string | null
  id: string
  name: string
}>

export type RoCatalogAuditPaymentProviderLink = Readonly<{
  payment_provider_id: string
  region_id: string
}>

export type RoCatalogAuditPaymentProvider = Readonly<{
  id: string
  is_enabled?: boolean | null
}>

export type RoCatalogAuditShippingOption = Readonly<{
  id: string
  name: string
  service_zone?: Readonly<{
    geo_zones?: readonly Readonly<{
      country_code?: string | null
      type?: string | null
    }>[]
  }> | null
}>

export type RoCatalogAuditShippingPriceSet = Readonly<{
  price_set?: Readonly<{
    prices?: readonly Readonly<{ currency_code?: string | null }>[]
  }> | null
  shipping_option_id: string
}>

export type RoCatalogAuditTaxRegion = Readonly<{
  country_code?: string | null
  id: string
  province_code?: string | null
}>

export type RoCatalogAuditTaxRate = Readonly<{
  id: string
  is_default?: boolean | null
  rate?: number | string | null
  tax_region_id: string
}>

export type RoCatalogReadinessInput = Readonly<{
  assignments: readonly RoCatalogAuditAssignment[]
  brands: readonly RoCatalogAuditBrand[]
  categories: readonly RoCatalogAuditCategory[]
  collections: readonly RoCatalogAuditCollection[]
  demoContentOmissions?: readonly RoDemoContentOmission[]
  inventoryItemLinks?: readonly RoCatalogAuditInventoryItemLink[]
  inventoryLevels?: readonly RoCatalogAuditInventoryLevel[]
  productContents: readonly RoCatalogAuditProductContent[]
  products: readonly RoCatalogAuditProduct[]
  readinessMode?: RoReadinessMode
  reviewedNeutralEqualities?: readonly RoCatalogReviewedNeutralEquality[]
  paymentProviders: readonly RoCatalogAuditPaymentProvider[]
  regionPaymentProviderLinks: readonly RoCatalogAuditPaymentProviderLink[]
  regions: readonly RoCatalogAuditRegion[]
  shippingOptions: readonly RoCatalogAuditShippingOption[]
  shippingPriceSets: readonly RoCatalogAuditShippingPriceSet[]
  taxRates: readonly RoCatalogAuditTaxRate[]
  taxRegions: readonly RoCatalogAuditTaxRegion[]
  translations: readonly RoCatalogAuditTranslation[]
}>

export type RoCatalogAuditInventoryItemLink = Readonly<{
  inventory_item_id: string
  required_quantity?: number | null
  variant_id: string
}>

export type RoCatalogAuditInventoryLevel = Readonly<{
  incoming_quantity?: number | null
  inventory_item_id: string
  location_id: string
  reserved_quantity?: number | null
  stocked_quantity?: number | null
}>

export type RoCatalogReadinessIssue = Readonly<{
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
}>

export type RoCatalogReadinessReport = Readonly<{
  cutoverChainProof: Readonly<{
    catalogPlanHash: string
    commerceManifestSha256: string
    commercePlanSha256: string
    databaseInstanceFingerprint: string
    matched: true
    maintenanceProofSha256: string
    meilisearchConvergenceSha256: string
    postCommerceEnvelopeSha256: string
    receiptSha256: string
    releaseId: string
    schemaVersion: 1
    scopeSha256: string
    staticTaxonomyConvergenceSha256: string
    urlRegistryConvergenceSha256: string
  }>
  generatedAt: string
  issues: readonly RoCatalogReadinessIssue[]
  market: typeof RO_MARKET
  ready: boolean
  readinessMode: RoReadinessMode
  roCatalogPublication: Readonly<{
    brandIds: readonly string[]
    categoryIds: readonly string[]
    collectionIds: readonly string[]
  }>
  roBrandScope: Readonly<{
    excluded: number
    excludedIds: readonly string[]
    global: number
    published: number
    publishedIds: readonly string[]
  }>
  roCompletenessProof: Readonly<{
    algorithm: "sha256-canonical-json-v1"
    dataHash: string
    demoOmissionLedgerHash: string | null
    locale: typeof RO_LOCALE
    provenance: RoReadinessProvenance
    schemaVersion: 1
  }>
  skBaseline: Readonly<{
    expected: SkPublicationBaseline
    matched: boolean
    observed: SkPublicationBaseline
  }>
  skPublication: Readonly<{
    brands: number
    categories: number
    collections: number
    errors: number
    products: number
  }>
  scope: "ro-published-products-and-catalog-assignments"
  roProductScope: Readonly<{
    draft: number
    excluded: readonly Readonly<{
      id: string
      reason: "invalid-publication" | "ro-draft" | "ro-unassigned"
    }>[]
    globalPublished: number
    invalid: number
    published: number
    publishedIds: readonly string[]
    unassigned: number
  }>
  roVariantScope: Readonly<{
    dataHash: string
    sellable: number
    unavailable: number
  }>
  scopePlanProof: Readonly<{
    expectedDataHash: string
    importPlanHash: string
    matched: boolean
    observedDataHash: string
    schemaVersion: 1
  }>
  sharedInventoryBaseline: Readonly<{
    expected: SharedInventoryBaseline
    matched: boolean
    observed: SharedInventoryBaseline
  }>
  roCategoryScope: Readonly<{
    active: number
    authoritySha256: typeof REVIEWED_RO_CATEGORY_AUTHORITY_SHA256
    draft: number
    excluded: readonly Readonly<{
      id: string
      reason: string
      state: "draft" | "unassigned"
    }>[]
    invalid: number
    published: number
    translated: number
    unassigned: number
  }>
  summary: Readonly<{
    brandUrlAssignments: number
    brands: number
    categories: number
    categoryUrlAssignments: number
    categoryLocalizedContentContracts: number
    demoContentOmissionFields: number
    demoOmissionLedgerEntries: number
    demoProductsWithContentOmissions: number
    collectionUrlAssignments: number
    collections: number
    errors: number
    productContentRecords: number
    products: number
    productUrlAssignments: number
    regionPaymentProviders: number
    regionsForRomania: number
    reviewedNeutralEqualitiesUsed: number
    roShippingOptions: number
    roShippingOptionsWithRonPrice: number
    roTaxRates: number
    roTaxRegions: number
    translations: number
    variants: number
    variantsWithRonPrice: number
    warnings: number
  }>
}>

export type SkPublicationBaseline = Readonly<{
  count: number
  sha256: string
}>

export type SharedInventoryBaseline = Readonly<{
  count: number
  sha256: string
}>

export type RoReadinessProvenance =
  | "fresh-medusa-database-read"
  | "in-memory-audit-input"

export type RoReadinessMode = "demo" | "production"

export type RoCutoverChainProof = RoCatalogReadinessReport["cutoverChainProof"]

export type RoCatalogScopePlan = RoCatalogScopePlanArtifact

export type RoDemoContentOmission = Readonly<{
  omittedFields: readonly (typeof PRODUCT_CONTENT_TRANSLATABLE_FIELDS)[number][]
  productContentId: string
  productId: string
  roDescriptionSha256: string
  sourceContentSha256: string
  sourceUrl: string
}>

export type RoDemoContentOmissionLedger = Readonly<{
  entries: readonly RoDemoContentOmission[]
  mode: "official-ro-description-only"
  schemaVersion: 1
}>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const normalize = (value: unknown) =>
  typeof value === "string" ? value.trim().toLocaleLowerCase("ro") : ""

export const normalizeRoCatalogComparableText = (value: unknown) =>
  typeof value === "string"
    ? value
        .normalize("NFKC")
        .replace(HTML_TAG, " ")
        .replace(HTML_ENTITY, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase("ro")
    : ""

const translationKey = (
  reference: string,
  referenceId: string,
  locale = RO_LOCALE
) => `${locale}:${reference}:${referenceId}`

const addIssue = (
  issues: RoCatalogReadinessIssue[],
  issue: RoCatalogReadinessIssue
) => {
  issues.push(issue)
}

const buildTranslationIndex = (
  translations: readonly RoCatalogAuditTranslation[],
  issues: RoCatalogReadinessIssue[]
) => {
  const index = new Map<string, RoCatalogAuditTranslation>()
  for (const translation of translations) {
    if (translation.deleted_at || translation.locale_code !== RO_LOCALE) {
      continue
    }
    const key = translationKey(
      translation.reference,
      translation.reference_id,
      translation.locale_code
    )
    if (index.has(key)) {
      addIssue(issues, {
        code: "AMBIGUOUS_RO_TRANSLATION",
        entityId: translation.reference_id,
        entityKind:
          translation.reference === "product_category" ? "category" : "product",
        message: `Multiple active ${RO_LOCALE} Translation records exist for ${translation.reference}:${translation.reference_id}.`,
        severity: "error",
      })
      continue
    }
    index.set(key, translation)
  }
  return index
}

const checkRequiredTranslatedFields = ({
  entityId,
  entityKind,
  reference,
  requiredFields,
  reviewedNeutralEqualities,
  translationIndex,
  issues,
}: Readonly<{
  entityId: string
  entityKind: "brand" | "category" | "collection" | "product"
  issues: RoCatalogReadinessIssue[]
  reference: string
  requiredFields: readonly Readonly<{ field: string; sourceValue: unknown }>[]
  reviewedNeutralEqualities: readonly RoCatalogReviewedNeutralEquality[]
  translationIndex: ReadonlyMap<string, RoCatalogAuditTranslation>
}>) => {
  const translation = translationIndex.get(translationKey(reference, entityId))
  if (!translation) {
    addIssue(issues, {
      code: "MISSING_RO_TRANSLATION",
      entityId,
      entityKind,
      message: `${reference}:${entityId} has no exact ${RO_LOCALE} Translation record.`,
      severity: "error",
    })
    return 0
  }
  let reviewedNeutralEqualitiesUsed = 0
  for (const { field, sourceValue } of requiredFields) {
    const translatedValue = translation.translations[field]
    if (!hasText(translatedValue)) {
      addIssue(issues, {
        code: "MISSING_RO_TRANSLATED_FIELD",
        entityId,
        entityKind,
        message: `${reference}:${entityId} is missing non-empty Romanian field "${field}".`,
        severity: "error",
      })
      continue
    }
    const normalizedSource = normalizeRoCatalogComparableText(sourceValue)
    const normalizedTranslation =
      normalizeRoCatalogComparableText(translatedValue)
    if (!normalizedSource || normalizedSource !== normalizedTranslation) {
      continue
    }
    const equalityReviewed = reviewedNeutralEqualities.some(
      (entry) =>
        entry.entityId === entityId &&
        entry.entityKind === entityKind &&
        entry.field === field &&
        entry.reference === reference &&
        entry.normalizedValue === normalizedSource &&
        hasText(entry.reason)
    )
    if (equalityReviewed) {
      reviewedNeutralEqualitiesUsed += 1
      continue
    }
    addIssue(issues, {
      code: "RO_TRANSLATION_EQUALS_SOURCE",
      entityId,
      entityKind,
      message: `${reference}:${entityId} Romanian field "${field}" is identical to the source text and has no reviewed neutral-equality exception.`,
      severity: "error",
    })
  }
  return reviewedNeutralEqualitiesUsed
}

const sourceRequiredFields = (
  required: string,
  requiredValue: unknown,
  conditional: Readonly<Record<string, unknown>>
) => [
  { field: required, sourceValue: requiredValue },
  ...Object.entries(conditional).flatMap(([field, source]) =>
    hasText(source) ? [{ field, sourceValue: source }] : []
  ),
]

const compareLocalizedSlug = ({
  entityId,
  entityKind,
  roSlug,
  skSlug,
  sourceTitle,
  translatedTitle,
  issues,
}: Readonly<{
  entityId: string
  entityKind: "brand" | "category" | "collection" | "product"
  issues: RoCatalogReadinessIssue[]
  roSlug: string
  skSlug?: string
  sourceTitle: string
  translatedTitle?: unknown
}>) => {
  if (
    skSlug &&
    roSlug === skSlug &&
    hasText(translatedTitle) &&
    normalize(translatedTitle) !== normalize(sourceTitle)
  ) {
    addIssue(issues, {
      code: "RO_SLUG_REUSES_SK_SLUG",
      entityId,
      entityKind,
      message: `Romanian public slug "${roSlug}" is identical to Slovak even though the Romanian title differs.`,
      severity: "error",
    })
  }
}

const checkDuplicateSlugs = (
  entries: readonly Readonly<{
    entityId: string
    entityKind: "brand" | "category" | "collection" | "product"
    publicSlug: string
  }>[],
  issues: RoCatalogReadinessIssue[]
) => {
  const ownerBySlug = new Map<string, string>()
  for (const entry of entries) {
    const slugIdentity = `${entry.entityKind}:${entry.publicSlug}`
    const previous = ownerBySlug.get(slugIdentity)
    if (previous && previous !== entry.entityId) {
      addIssue(issues, {
        code: "DUPLICATE_RO_PUBLIC_SLUG",
        entityId: entry.entityId,
        entityKind: entry.entityKind,
        message: `Romanian public slug "${entry.publicSlug}" is shared by ${previous} and ${entry.entityId}.`,
        severity: "error",
      })
      continue
    }
    ownerBySlug.set(slugIdentity, entry.entityId)
  }
}

type PublicSlugEntry = Readonly<{
  entityId: string
  entityKind: "brand" | "category" | "collection" | "product"
  publicSlug: string
}>

const auditProductContent = ({
  demoOmissionByProductId,
  issues,
  product,
  productContentByProductId,
  readinessMode,
  reviewedNeutralEqualities,
  translationIndex,
  usedDemoOmissionProductIds,
}: Readonly<{
  demoOmissionByProductId: ReadonlyMap<string, RoDemoContentOmission>
  issues: RoCatalogReadinessIssue[]
  product: RoCatalogAuditProduct
  productContentByProductId: ReadonlyMap<string, RoCatalogAuditProductContent>
  readinessMode: RoReadinessMode
  reviewedNeutralEqualities: readonly RoCatalogReviewedNeutralEquality[]
  translationIndex: ReadonlyMap<string, RoCatalogAuditTranslation>
  usedDemoOmissionProductIds: Set<string>
}>) => {
  const content = productContentByProductId.get(product.id)
  if (!content) {
    addIssue(issues, {
      code: "MISSING_PRODUCT_CONTENT_SOURCE",
      entityId: product.id,
      entityKind: "product",
      message: `Published product ${product.id} has no product_content record.`,
      severity: "error",
    })
    return {
      demoContentOmissionFields: 0,
      demoProductsWithContentOmissions: 0,
      reviewedNeutralEqualitiesUsed: 0,
    }
  }
  const omission = demoOmissionByProductId.get(product.id)
  let acceptedOmittedFields = new Set<string>()
  if (omission && readinessMode === "demo") {
    const productTranslation = translationIndex.get(
      translationKey("product", product.id)
    )
    const contentTranslation = translationIndex.get(
      translationKey("product_content", content.id)
    )
    const description = productTranslation?.translations.description
    const descriptionHash =
      typeof description === "string" &&
      hasRenderableVisibleContent(description)
        ? createHash("sha256").update(description).digest("hex")
        : null
    const ledgerSha256 = buildDemoOmissionLedgerHash([
      ...demoOmissionByProductId.values(),
    ])
    const persistedAuthority = verifyRoDemoOmissionAuthority(
      contentTranslation?.translations[RO_DEMO_OMISSION_AUTHORITY_KEY],
      {
        ledgerSha256,
        productContentId: content.id,
        productId: product.id,
        roDescriptionSha256: omission.roDescriptionSha256,
      }
    )
    const allOmittedValuesAreExactEmpty = omission.omittedFields.every(
      (field) => contentTranslation?.translations[field] === ""
    )
    const sharedContractComplete =
      productTranslation && contentTranslation
        ? isCompleteProductContentPublicationTranslation({
            productContent: content as RoCatalogAuditProductContent & {
              id: string
              product_id: string
            },
            productTranslation,
            translation: contentTranslation,
          })
        : false
    if (
      omission.productContentId === content.id &&
      descriptionHash === omission.roDescriptionSha256 &&
      allOmittedValuesAreExactEmpty &&
      persistedAuthority?.sourceUrl === omission.sourceUrl &&
      persistedAuthority.sourceContentSha256 === omission.sourceContentSha256 &&
      sharedContractComplete
    ) {
      acceptedOmittedFields = new Set(omission.omittedFields)
      usedDemoOmissionProductIds.add(product.id)
      addIssue(issues, {
        code: "RO_DEMO_STRUCTURED_CONTENT_OMITTED",
        entityId: product.id,
        entityKind: "product",
        message: `Demo product ${product.id} intentionally omits ${omission.omittedFields.join(", ")} because the official Romanian source provides only a full description; empty UI sections must remain hidden.`,
        severity: "warning",
      })
    } else {
      addIssue(issues, {
        code: "RO_DEMO_CONTENT_OMISSION_INVALID",
        entityId: product.id,
        entityKind: "product",
        message: `Demo omission proof for product ${product.id} does not match its signed persisted authority, external ledger, renderable Romanian description, product_content ID, or exact empty fields.`,
        severity: "error",
      })
    }
  }
  const requiredFields = PRODUCT_CONTENT_TRANSLATABLE_FIELDS.flatMap((field) =>
    hasText(content[field]) && !acceptedOmittedFields.has(field)
      ? [{ field, sourceValue: content[field] }]
      : []
  )
  let reviewedNeutralEqualitiesUsed = 0
  if (requiredFields.length > 0) {
    reviewedNeutralEqualitiesUsed = checkRequiredTranslatedFields({
      entityId: content.id,
      entityKind: "product",
      issues,
      reference: "product_content",
      requiredFields,
      reviewedNeutralEqualities,
      translationIndex,
    })
  }
  return {
    demoContentOmissionFields: acceptedOmittedFields.size,
    demoProductsWithContentOmissions: acceptedOmittedFields.size > 0 ? 1 : 0,
    reviewedNeutralEqualitiesUsed,
  }
}

const auditProductUrl = (
  product: RoCatalogAuditProduct,
  translationIndex: ReadonlyMap<string, RoCatalogAuditTranslation>,
  issues: RoCatalogReadinessIssue[],
  publicSlugs: PublicSlugEntry[]
) => {
  try {
    const snapshot = parseProductPublicationSnapshot(product)
    const assignment = snapshot.assignments.ro
    if (assignment?.publicationStatus === "published") {
      publicSlugs.push({
        entityId: product.id,
        entityKind: "product",
        publicSlug: assignment.publicSlug,
      })
      compareLocalizedSlug({
        entityId: product.id,
        entityKind: "product",
        issues,
        roSlug: assignment.publicSlug,
        skSlug: snapshot.assignments.sk?.publicSlug,
        sourceTitle: product.title,
        translatedTitle: translationIndex.get(
          translationKey("product", product.id)
        )?.translations.title,
      })
      return 1
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error"
    addIssue(issues, {
      code: detail.includes("unlinked sales channel")
        ? "RO_PRODUCT_CHANNEL_NOT_LINKED"
        : "INVALID_PRODUCT_PUBLICATION_METADATA",
      entityId: product.id,
      entityKind: "product",
      message: `${PRODUCT_PUBLICATION_METADATA_KEY} is invalid: ${detail}.`,
      severity: "error",
    })
  }
  addIssue(issues, {
    code: "MISSING_PUBLISHED_RO_PRODUCT_SLUG",
    entityId: product.id,
    entityKind: "product",
    message: `Published product ${product.id} has no published RO publicSlug assignment.`,
    severity: "error",
  })
  return 0
}

const auditProductPrices = (
  product: RoCatalogAuditProduct,
  issues: RoCatalogReadinessIssue[],
  expectations?: readonly RoVariantAvailabilityExpectation[]
) => {
  let variantsWithRonPrice = 0
  let sellable = 0
  let unavailable = 0
  const expectedByVariantId = new Map<
    string,
    RoVariantAvailabilityExpectation
  >()
  for (const expectation of expectations ?? []) {
    const matches = product.variants.filter((variant) =>
      expectation.keyKind === "sku"
        ? variant.sku === expectation.keyValue
        : variant.ean === expectation.keyValue
    )
    if (matches.length !== 1 || !matches[0]) {
      addIssue(issues, {
        code: "RO_VARIANT_AVAILABILITY_IDENTITY_INVALID",
        entityId: product.id,
        entityKind: "price",
        message: `Planned ${expectation.keyKind}:${expectation.keyValue} does not resolve to exactly one variant of ${product.id}.`,
        severity: "error",
      })
      continue
    }
    expectedByVariantId.set(matches[0].id, expectation)
  }
  for (const variant of product.variants) {
    const ronPrices = (variant.prices ?? []).filter(
      (price) => normalize(price.currency_code) === RO_CURRENCY
    )
    const expectation = expectations
      ? expectedByVariantId.get(variant.id)
      : ({
          keyKind: "sku",
          keyValue: variant.sku ?? variant.id,
          productId: product.id,
          roAvailability: "sellable",
          ronAmount: ronPrices[0]?.amount ?? null,
        } satisfies RoVariantAvailabilityExpectation)
    if (!expectation) {
      addIssue(issues, {
        code: "RO_VARIANT_AVAILABILITY_MISSING",
        entityId: variant.id,
        entityKind: "price",
        message: `Variant ${variant.id} has no hash-bound RO availability decision.`,
        severity: "error",
      })
      continue
    }
    if (expectation.roAvailability === "unavailable") {
      unavailable += 1
      if (ronPrices.length > 0) {
        addIssue(issues, {
          code: "UNAVAILABLE_RO_VARIANT_HAS_RON_PRICE",
          entityId: variant.id,
          entityKind: "price",
          message: `RO-unavailable variant ${variant.id} unexpectedly has a RON price.`,
          severity: "error",
        })
      }
      continue
    }
    sellable += 1
    if (
      ronPrices.length === 1 &&
      ronPrices[0]?.amount === expectation.ronAmount
    ) {
      variantsWithRonPrice += 1
      continue
    }
    addIssue(issues, {
      code: "MISSING_RON_VARIANT_PRICE",
      entityId: variant.id,
      entityKind: "price",
      message: `Sellable variant ${variant.id} of product ${product.id} does not have its exact approved RON price ${expectation.ronAmount}.`,
      severity: "error",
    })
  }
  return {
    sellable,
    unavailable,
    variants: product.variants.length,
    variantsWithRonPrice,
  }
}

const selectRoPublishedProducts = (
  products: readonly RoCatalogAuditProduct[],
  issues: RoCatalogReadinessIssue[]
) => {
  const published: RoCatalogAuditProduct[] = []
  const excluded: Array<{
    id: string
    reason: "invalid-publication" | "ro-draft" | "ro-unassigned"
  }> = []
  for (const product of products) {
    try {
      const assignment = parseProductPublicationSnapshot(product).assignments.ro
      if (assignment?.publicationStatus === "published") {
        published.push(product)
      } else {
        excluded.push({
          id: product.id,
          reason: assignment ? "ro-draft" : "ro-unassigned",
        })
      }
    } catch (error) {
      excluded.push({ id: product.id, reason: "invalid-publication" })
      addIssue(issues, {
        code:
          error instanceof Error &&
          error.message.includes("unlinked sales channel")
            ? "RO_PRODUCT_CHANNEL_NOT_LINKED"
            : "INVALID_PRODUCT_PUBLICATION_METADATA",
        entityId: product.id,
        entityKind: "product",
        message: `${PRODUCT_PUBLICATION_METADATA_KEY} is invalid: ${error instanceof Error ? error.message : "unknown error"}.`,
        severity: "error",
      })
    }
  }
  return {
    draft: excluded.filter(({ reason }) => reason === "ro-draft").length,
    excluded: excluded.sort((left, right) => left.id.localeCompare(right.id)),
    globalPublished: products.length,
    invalid: excluded.filter(({ reason }) => reason === "invalid-publication")
      .length,
    published,
    unassigned: excluded.filter(({ reason }) => reason === "ro-unassigned")
      .length,
  }
}

const auditProductPublicationContract = (
  product: RoCatalogAuditProduct,
  translationIndex: ReadonlyMap<string, RoCatalogAuditTranslation>,
  issues: RoCatalogReadinessIssue[]
) => {
  const translation = translationIndex.get(
    translationKey("product", product.id)
  )
  if (
    translation &&
    !isCompleteProductPublicationTranslation(product, translation)
  ) {
    addIssue(issues, {
      code: "RO_PRODUCT_PUBLICATION_TRANSLATION_INCOMPLETE",
      entityId: product.id,
      entityKind: "product",
      message: `Product ${product.id} fails the shared Romanian publication translation contract.`,
      severity: "error",
    })
  }
}

const auditProducts = ({
  expectedVariantExpectations,
  input,
  issues,
  products,
  publicSlugs,
  translationIndex,
}: Readonly<{
  expectedVariantExpectations?: readonly RoVariantAvailabilityExpectation[]
  input: RoCatalogReadinessInput
  issues: RoCatalogReadinessIssue[]
  products: readonly RoCatalogAuditProduct[]
  publicSlugs: PublicSlugEntry[]
  translationIndex: ReadonlyMap<string, RoCatalogAuditTranslation>
}>) => {
  const productContentByProductId = new Map(
    input.productContents.map((content) => [content.product_id, content])
  )
  const demoOmissionByProductId = new Map(
    (input.demoContentOmissions ?? []).map((entry) => [entry.productId, entry])
  )
  const usedDemoOmissionProductIds = new Set<string>()
  let demoContentOmissionFields = 0
  let demoProductsWithContentOmissions = 0
  let productUrlAssignments = 0
  let reviewedNeutralEqualitiesUsed = 0
  let variants = 0
  let variantsWithRonPrice = 0
  let sellableVariants = 0
  let unavailableVariants = 0
  for (const product of products) {
    auditProductPublicationContract(product, translationIndex, issues)
    reviewedNeutralEqualitiesUsed += checkRequiredTranslatedFields({
      entityId: product.id,
      entityKind: "product",
      issues,
      reference: "product",
      requiredFields: sourceRequiredFields("title", product.title, {
        description: product.description,
        subtitle: product.subtitle,
      }),
      reviewedNeutralEqualities:
        input.reviewedNeutralEqualities ?? REVIEWED_RO_NEUTRAL_EQUALITIES,
      translationIndex,
    })
    const contentCounts = auditProductContent({
      demoOmissionByProductId,
      issues,
      product,
      productContentByProductId,
      readinessMode: input.readinessMode ?? "production",
      reviewedNeutralEqualities:
        input.reviewedNeutralEqualities ?? REVIEWED_RO_NEUTRAL_EQUALITIES,
      translationIndex,
      usedDemoOmissionProductIds,
    })
    reviewedNeutralEqualitiesUsed += contentCounts.reviewedNeutralEqualitiesUsed
    demoContentOmissionFields += contentCounts.demoContentOmissionFields
    demoProductsWithContentOmissions +=
      contentCounts.demoProductsWithContentOmissions
    productUrlAssignments += auditProductUrl(
      product,
      translationIndex,
      issues,
      publicSlugs
    )
    const priceCounts = auditProductPrices(
      product,
      issues,
      expectedVariantExpectations?.filter(
        (expectation) => expectation.productId === product.id
      )
    )
    variants += priceCounts.variants
    variantsWithRonPrice += priceCounts.variantsWithRonPrice
    sellableVariants += priceCounts.sellable
    unavailableVariants += priceCounts.unavailable
  }
  if ((input.readinessMode ?? "production") === "demo") {
    for (const omission of input.demoContentOmissions ?? []) {
      if (usedDemoOmissionProductIds.has(omission.productId)) {
        continue
      }
      addIssue(issues, {
        code: "RO_DEMO_CONTENT_OMISSION_UNUSED",
        entityId: omission.productId,
        entityKind: "product",
        message: `Demo omission entry for product ${omission.productId} was not consumed by an RO-published product.`,
        severity: "error",
      })
    }
  }
  return {
    demoContentOmissionFields,
    demoProductsWithContentOmissions,
    productUrlAssignments,
    reviewedNeutralEqualitiesUsed,
    sellableVariants,
    unavailableVariants,
    variants,
    variantsWithRonPrice,
  }
}

const auditCategoryLocalizedContent = (
  category: RoCatalogAuditCategory,
  translationIndex: ReadonlyMap<string, RoCatalogAuditTranslation>,
  reviewedNeutralEqualities: readonly RoCatalogReviewedNeutralEquality[],
  issues: RoCatalogReadinessIssue[]
) => {
  const metadata = isRecord(category.metadata) ? category.metadata : {}
  const translation = translationIndex.get(
    translationKey("product_category", category.id)
  )
  if (!translation) {
    return { contractReady: 0, reviewedNeutralEqualitiesUsed: 0 }
  }
  let contractValid = true
  for (const field of CATEGORY_LOCALIZED_CONTENT_FIELDS) {
    if (!Object.hasOwn(translation.translations, field)) {
      contractValid = false
      addIssue(issues, {
        code: "RO_CATEGORY_LOCALIZED_CONTENT_FIELD_MISSING",
        entityId: category.id,
        entityKind: "category",
        message: `Category ${category.id} exact ${RO_LOCALE} Translation does not own localized-content field "${field}".`,
        severity: "error",
      })
      continue
    }
    const value = translation.translations[field]
    if (!(value === null || typeof value === "string")) {
      contractValid = false
      addIssue(issues, {
        code: "RO_CATEGORY_LOCALIZED_CONTENT_FIELD_INVALID",
        entityId: category.id,
        entityKind: "category",
        message: `Category ${category.id} localized-content field "${field}" must be string or null.`,
        severity: "error",
      })
    }
  }
  const sourceBackedFields = CATEGORY_RICH_METADATA_FIELDS.flatMap((field) =>
    hasText(metadata[field]) ? [{ field, sourceValue: metadata[field] }] : []
  )
  const issueCountBeforeSourceComparison = issues.length
  const reviewedNeutralEqualitiesUsed = checkRequiredTranslatedFields({
    entityId: category.id,
    entityKind: "category",
    issues,
    reference: "product_category",
    requiredFields: sourceBackedFields,
    reviewedNeutralEqualities,
    translationIndex,
  })
  if (issues.length > issueCountBeforeSourceComparison) {
    contractValid = false
  }
  return {
    contractReady: contractValid ? 1 : 0,
    reviewedNeutralEqualitiesUsed,
  }
}

const auditCategories = ({
  activeCategories,
  assignments,
  issues,
  publicSlugs,
  reviewedNeutralEqualities,
  translationIndex,
}: Readonly<{
  activeCategories: readonly RoCatalogAuditCategory[]
  assignments: readonly RoCatalogAuditAssignment[]
  issues: RoCatalogReadinessIssue[]
  publicSlugs: PublicSlugEntry[]
  reviewedNeutralEqualities: readonly RoCatalogReviewedNeutralEquality[]
  translationIndex: ReadonlyMap<string, RoCatalogAuditTranslation>
}>) => {
  const assignmentByIdentity = new Map(
    assignments
      .filter((assignment) => assignment.entity_kind === "category")
      .map((assignment) => [
        `${assignment.market_code}:${assignment.entity_id}`,
        assignment,
      ])
  )
  let categoryUrlAssignments = 0
  let categoryLocalizedContentContracts = 0
  const publishedCategoryIds: string[] = []
  const excluded: Array<{
    id: string
    reason: string
    state: "draft" | "unassigned"
  }> = []
  let invalid = 0
  let unassigned = 0
  let reviewedNeutralEqualitiesUsed = 0
  for (const category of activeCategories) {
    reviewedNeutralEqualitiesUsed += checkRequiredTranslatedFields({
      entityId: category.id,
      entityKind: "category",
      issues,
      reference: "product_category",
      requiredFields: sourceRequiredFields("name", category.name, {
        description: category.description,
      }),
      reviewedNeutralEqualities,
      translationIndex,
    })
    const localizedContent = auditCategoryLocalizedContent(
      category,
      translationIndex,
      reviewedNeutralEqualities,
      issues
    )
    categoryLocalizedContentContracts += localizedContent.contractReady
    reviewedNeutralEqualitiesUsed +=
      localizedContent.reviewedNeutralEqualitiesUsed
    const categoryTranslation = translationIndex.get(
      translationKey("product_category", category.id)
    )
    if (
      categoryTranslation &&
      !isCompleteCategoryPublicationTranslation(categoryTranslation)
    ) {
      addIssue(issues, {
        code: "RO_CATEGORY_PUBLICATION_TRANSLATION_INCOMPLETE",
        entityId: category.id,
        entityKind: "category",
        message: `Category ${category.id} fails the shared Romanian publication translation contract.`,
        severity: "error",
      })
    }
    const assignment = assignmentByIdentity.get(`ro:${category.id}`)
    const reviewedExclusion = REVIEWED_RO_CATEGORY_EXCLUSIONS.find(
      (entry) => entry.id === category.id
    )
    if (
      reviewedExclusion &&
      (!assignment || assignment.publication_status === "draft")
    ) {
      excluded.push({
        ...reviewedExclusion,
        state: assignment ? "draft" : "unassigned",
      })
      continue
    }
    if (
      !assignment ||
      assignment.publication_status !== "published" ||
      !PUBLIC_SLUG.test(assignment.public_slug)
    ) {
      addIssue(issues, {
        code: "MISSING_PUBLISHED_RO_CATEGORY_SLUG",
        entityId: category.id,
        entityKind: "category",
        message: `Active category ${category.id} has no valid published RO publicSlug assignment.`,
        severity: "error",
      })
      if (assignment) {
        invalid += 1
      } else {
        unassigned += 1
      }
      continue
    }
    categoryUrlAssignments += 1
    publishedCategoryIds.push(category.id)
    publicSlugs.push({
      entityId: category.id,
      entityKind: "category",
      publicSlug: assignment.public_slug,
    })
    compareLocalizedSlug({
      entityId: category.id,
      entityKind: "category",
      issues,
      roSlug: assignment.public_slug,
      skSlug: assignmentByIdentity.get(`sk:${category.id}`)?.public_slug,
      sourceTitle: category.name,
      translatedTitle: translationIndex.get(
        translationKey("product_category", category.id)
      )?.translations.name,
    })
  }
  return {
    categoryLocalizedContentContracts,
    categoryUrlAssignments,
    excluded: excluded.sort((left, right) => left.id.localeCompare(right.id)),
    invalid,
    publishedCategoryIds: publishedCategoryIds.sort(),
    reviewedNeutralEqualitiesUsed,
    unassigned,
  }
}

const auditAssignedBrandsAndCollections = ({
  expectedBrandExcludedIds,
  input,
  issues,
  publicSlugs,
  reviewedNeutralEqualities,
  translationIndex,
}: Readonly<{
  expectedBrandExcludedIds: readonly string[]
  input: RoCatalogReadinessInput
  issues: RoCatalogReadinessIssue[]
  publicSlugs: PublicSlugEntry[]
  reviewedNeutralEqualities: readonly RoCatalogReviewedNeutralEquality[]
  translationIndex: ReadonlyMap<string, RoCatalogAuditTranslation>
}>) => {
  const sources = {
    brand: new Map(input.brands.map((brand) => [brand.id, brand])),
    collection: new Map(
      input.collections.map((collection) => [collection.id, collection])
    ),
  } as const
  const contracts = {
    brand: { reference: "brand", sourceField: "title" },
    collection: {
      reference: "product_collection",
      sourceField: "title",
    },
  } as const
  const publishedIds = { brand: [] as string[], collection: [] as string[] }
  const expectedBrandExclusions = new Set(expectedBrandExcludedIds)
  let reviewedNeutralEqualitiesUsed = 0
  for (const assignment of input.assignments.filter(
    (candidate) =>
      candidate.market_code === "ro" &&
      candidate.publication_status === "published" &&
      (candidate.entity_kind === "brand" ||
        candidate.entity_kind === "collection")
  )) {
    const entityKind = assignment.entity_kind as "brand" | "collection"
    const source = sources[entityKind].get(assignment.entity_id)
    if (!source) {
      addIssue(issues, {
        code: "RO_PUBLISHED_CATALOG_SOURCE_MISSING",
        entityId: assignment.entity_id,
        entityKind,
        message: `Published RO ${entityKind} assignment references a missing source entity.`,
        severity: "error",
      })
      continue
    }
    if (!PUBLIC_SLUG.test(assignment.public_slug)) {
      addIssue(issues, {
        code: "INVALID_PUBLISHED_RO_CATALOG_SLUG",
        entityId: assignment.entity_id,
        entityKind,
        message: `Published RO ${entityKind} has invalid publicSlug "${assignment.public_slug}".`,
        severity: "error",
      })
      continue
    }
    const contract = contracts[entityKind]
    reviewedNeutralEqualitiesUsed += checkRequiredTranslatedFields({
      entityId: assignment.entity_id,
      entityKind,
      issues,
      reference: contract.reference,
      requiredFields: [
        { field: "title", sourceValue: source[contract.sourceField] },
      ],
      reviewedNeutralEqualities,
      translationIndex,
    })
    publishedIds[entityKind].push(assignment.entity_id)
    publicSlugs.push({
      entityId: assignment.entity_id,
      entityKind,
      publicSlug: assignment.public_slug,
    })
    const skAssignment = input.assignments.find(
      (candidate) =>
        candidate.entity_kind === entityKind &&
        candidate.entity_id === assignment.entity_id &&
        candidate.market_code === "sk" &&
        candidate.publication_status === "published"
    )
    compareLocalizedSlug({
      entityId: assignment.entity_id,
      entityKind,
      issues,
      roSlug: assignment.public_slug,
      skSlug: skAssignment?.public_slug,
      sourceTitle: source.title,
      translatedTitle: translationIndex.get(
        translationKey(contract.reference, assignment.entity_id)
      )?.translations.title,
    })
  }
  for (const entityKind of ["brand", "collection"] as const) {
    const published = new Set(publishedIds[entityKind])
    for (const sourceId of sources[entityKind].keys()) {
      if (published.has(sourceId)) {
        continue
      }
      if (entityKind === "brand" && expectedBrandExclusions.has(sourceId)) {
        continue
      }
      addIssue(issues, {
        code: `MISSING_PUBLISHED_RO_${entityKind.toUpperCase()}_ASSIGNMENT`,
        entityId: sourceId,
        entityKind,
        message: `${entityKind} ${sourceId} has no valid published RO assignment.`,
        severity: "error",
      })
    }
  }
  for (const excludedId of expectedBrandExclusions) {
    if (
      !sources.brand.has(excludedId) ||
      publishedIds.brand.includes(excludedId)
    ) {
      addIssue(issues, {
        code: "RO_BRAND_EXCLUSION_INVALID",
        entityId: excludedId,
        entityKind: "brand",
        message: `Expected RO brand exclusion ${excludedId} is missing from inventory or remains published.`,
        severity: "error",
      })
    }
  }
  return {
    brandIds: [...new Set(publishedIds.brand)].sort(),
    excludedBrandIds: [...expectedBrandExclusions].sort(),
    collectionIds: [...new Set(publishedIds.collection)].sort(),
    reviewedNeutralEqualitiesUsed,
  }
}

type SkPublicationKind = "brand" | "category" | "collection" | "product"

const SK_TRANSLATION_CONTRACT: Readonly<
  Record<
    SkPublicationKind,
    Readonly<{ field: "name" | "title"; reference: string }>
  >
> = {
  brand: { field: "title", reference: "brand" },
  category: { field: "name", reference: "product_category" },
  collection: { field: "title", reference: "product_collection" },
  product: { field: "title", reference: "product" },
}

type SkPublicationBaselineRow = Readonly<{
  entityId: string
  entityKind: SkPublicationKind
  publicSlug: string
  salesChannelId: string
  sourceProjection: unknown
  translationProjection: readonly unknown[]
}>

const canonicalizeForHash = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeForHash)
  }
  if (!isRecord(value)) {
    return value
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeForHash(value[key])])
  )
}

const stableJson = (value: unknown) =>
  JSON.stringify(canonicalizeForHash(value))

const withoutRoProductPublication = (metadata: unknown) => {
  if (!isRecord(metadata)) {
    return metadata
  }
  const publication = metadata[PRODUCT_PUBLICATION_METADATA_KEY]
  if (!(isRecord(publication) && isRecord(publication.markets))) {
    return metadata
  }
  const { ro: _ro, ...nonRoMarkets } = publication.markets
  return {
    ...metadata,
    [PRODUCT_PUBLICATION_METADATA_KEY]: {
      ...publication,
      markets: nonRoMarkets,
    },
  }
}

const sortByStableJson = <Value>(values: readonly Value[]) =>
  [...values].sort((left, right) =>
    stableJson(left).localeCompare(stableJson(right), "en")
  )

const skTranslationProjection = (
  translations: readonly RoCatalogAuditTranslation[],
  identities: ReadonlySet<string>
) =>
  sortByStableJson(
    translations
      .filter(
        (translation) =>
          !translation.deleted_at &&
          translation.locale_code === SK_LOCALE &&
          identities.has(`${translation.reference}:${translation.reference_id}`)
      )
      .map((translation) => ({
        id: translation.id,
        reference: translation.reference,
        referenceId: translation.reference_id,
        translations: translation.translations,
      }))
  )

const productSourceProjection = (
  product: RoCatalogAuditProduct,
  productContents: readonly RoCatalogAuditProductContent[]
) => {
  const { metadata, updated_at: _updatedAt, ...stableProduct } = product
  return {
    ...stableProduct,
    categories: sortByStableJson(product.categories ?? []),
    metadata: withoutRoProductPublication(metadata),
    productContents: sortByStableJson(productContents),
    sales_channels: sortByStableJson(product.sales_channels),
    variants: sortByStableJson(
      product.variants.map((variant) => ({
        ...variant,
        prices: sortByStableJson(
          (variant.prices ?? []).filter(
            (price) => normalize(price.currency_code) !== RO_CURRENCY
          )
        ),
      }))
    ),
  }
}

const productReadinessProofProjection = (product: RoCatalogAuditProduct) => {
  const { updated_at: _updatedAt, ...stableProduct } = product
  return {
    ...stableProduct,
    categories: sortByStableJson(product.categories ?? []),
    sales_channels: sortByStableJson(product.sales_channels),
    variants: sortByStableJson(
      product.variants.map((variant) => ({
        ...variant,
        prices: sortByStableJson(variant.prices ?? []),
      }))
    ),
  }
}

export const buildRoReadinessDataHash = (input: RoCatalogReadinessInput) => {
  const projection = {
    assignments: sortByStableJson(input.assignments),
    brands: sortByStableJson(input.brands),
    categories: sortByStableJson(input.categories),
    collections: sortByStableJson(input.collections),
    demoContentOmissions: sortByStableJson(input.demoContentOmissions ?? []),
    paymentProviders: sortByStableJson(input.paymentProviders),
    productContents: sortByStableJson(input.productContents),
    products: sortByStableJson(
      input.products.map(productReadinessProofProjection)
    ),
    readinessMode: input.readinessMode ?? "production",
    regionPaymentProviderLinks: sortByStableJson(
      input.regionPaymentProviderLinks
    ),
    regions: sortByStableJson(
      input.regions.map((region) => ({
        ...region,
        countries: sortByStableJson(region.countries ?? []),
      }))
    ),
    reviewedNeutralEqualities: sortByStableJson(
      input.reviewedNeutralEqualities ?? REVIEWED_RO_NEUTRAL_EQUALITIES
    ),
    shippingOptions: sortByStableJson(
      input.shippingOptions.map((option) => ({
        ...option,
        service_zone: option.service_zone
          ? {
              ...option.service_zone,
              geo_zones: sortByStableJson(option.service_zone.geo_zones ?? []),
            }
          : option.service_zone,
      }))
    ),
    shippingPriceSets: sortByStableJson(
      input.shippingPriceSets.map((priceSet) => ({
        ...priceSet,
        price_set: priceSet.price_set
          ? {
              ...priceSet.price_set,
              prices: sortByStableJson(priceSet.price_set.prices ?? []),
            }
          : priceSet.price_set,
      }))
    ),
    taxRates: sortByStableJson(input.taxRates),
    taxRegions: sortByStableJson(input.taxRegions),
    translations: sortByStableJson(
      input.translations
        .filter((translation) => !translation.deleted_at)
        .map(({ deleted_at: _deletedAt, ...translation }) => translation)
    ),
  }
  return createHash("sha256").update(stableJson(projection)).digest("hex")
}

export const buildDemoOmissionLedgerHash = (
  entries: readonly RoDemoContentOmission[]
) =>
  createHash("sha256")
    .update(
      stableJson({
        entries: sortByStableJson(entries),
        mode: "official-ro-description-only",
        schemaVersion: 1,
      })
    )
    .digest("hex")

export const buildRoCatalogScopePlanHash = (scope: RoCatalogScopePlan) =>
  hashRoCatalogScopePlan(scope)

const skTranslationCandidates = (
  translations: readonly RoCatalogAuditTranslation[],
  entityKind: SkPublicationKind,
  entityId: string
) => {
  const contract = SK_TRANSLATION_CONTRACT[entityKind]
  return translations.filter(
    (translation) =>
      !translation.deleted_at &&
      translation.locale_code === SK_LOCALE &&
      translation.reference === contract.reference &&
      translation.reference_id === entityId
  )
}

const auditSkTranslation = ({
  entityId,
  entityKind,
  issues,
  translations,
}: Readonly<{
  entityId: string
  entityKind: SkPublicationKind
  issues: RoCatalogReadinessIssue[]
  translations: readonly RoCatalogAuditTranslation[]
}>) => {
  const contract = SK_TRANSLATION_CONTRACT[entityKind]
  const candidates = skTranslationCandidates(translations, entityKind, entityId)
  if (candidates.length !== 1) {
    addIssue(issues, {
      code:
        candidates.length === 0
          ? "SK_PUBLISHED_TRANSLATION_MISSING"
          : "SK_PUBLISHED_TRANSLATION_AMBIGUOUS",
      entityId,
      entityKind,
      message: `${entityKind}:${entityId} requires exactly one active ${SK_LOCALE} ${contract.reference} Translation record; found ${candidates.length}.`,
      severity: "error",
    })
    return
  }
  const translation = candidates[0]
  const translatedValue = translation?.translations[contract.field]
  if (!(translation && hasText(translatedValue))) {
    addIssue(issues, {
      code: "SK_PUBLISHED_TRANSLATION_REQUIRED_FIELD_MISSING",
      entityId,
      entityKind,
      message: `${entityKind}:${entityId} ${SK_LOCALE} Translation is missing required field "${contract.field}".`,
      severity: "error",
    })
  }
}

const auditSkProductPublications = (
  input: RoCatalogReadinessInput,
  issues: RoCatalogReadinessIssue[],
  rows: SkPublicationBaselineRow[]
) => {
  let products = 0
  for (const product of input.products) {
    try {
      const assignment = parseProductPublicationSnapshot(product).assignments.sk
      if (assignment?.publicationStatus !== "published") {
        continue
      }
      products += 1
      auditSkTranslation({
        entityId: product.id,
        entityKind: "product",
        issues,
        translations: input.translations,
      })
      const productContents = input.productContents.filter(
        (content) => content.product_id === product.id
      )
      const translationIdentities = new Set([
        `product:${product.id}`,
        ...productContents.map((content) => `product_content:${content.id}`),
      ])
      rows.push({
        entityId: product.id,
        entityKind: "product",
        publicSlug: assignment.publicSlug,
        salesChannelId: assignment.salesChannelId,
        sourceProjection: productSourceProjection(product, productContents),
        translationProjection: skTranslationProjection(
          input.translations,
          translationIdentities
        ),
      })
    } catch (error) {
      addIssue(issues, {
        code: "SK_PRODUCT_PUBLICATION_INVALID",
        entityId: product.id,
        entityKind: "product",
        message: `SK product publication cannot be audited: ${error instanceof Error ? error.message : "unknown error"}.`,
        severity: "error",
      })
    }
  }

  return products
}

const auditSkAssignedPublications = (
  input: RoCatalogReadinessInput,
  issues: RoCatalogReadinessIssue[],
  rows: SkPublicationBaselineRow[]
) => {
  const counts = { brands: 0, categories: 0, collections: 0 }

  const categoryById = new Map(
    input.categories.map((category) => [category.id, category])
  )
  const brandById = new Map(input.brands.map((brand) => [brand.id, brand]))
  const collectionById = new Map(
    input.collections.map((collection) => [collection.id, collection])
  )
  const sources = {
    brand: brandById,
    category: categoryById,
    collection: collectionById,
  } as const
  const countKey = {
    brand: "brands",
    category: "categories",
    collection: "collections",
  } as const

  for (const assignment of input.assignments.filter(
    (candidate) =>
      candidate.market_code === "sk" &&
      candidate.publication_status === "published"
  )) {
    if (
      assignment.entity_kind !== "brand" &&
      assignment.entity_kind !== "category" &&
      assignment.entity_kind !== "collection"
    ) {
      continue
    }
    const entityKind = assignment.entity_kind
    const source = sources[entityKind].get(assignment.entity_id)
    counts[countKey[entityKind]] += 1
    if (!source) {
      addIssue(issues, {
        code: "SK_PUBLISHED_SOURCE_MISSING",
        entityId: assignment.entity_id,
        entityKind,
        message: `Published SK ${entityKind} assignment references a missing source entity.`,
        severity: "error",
      })
    }
    auditSkTranslation({
      entityId: assignment.entity_id,
      entityKind,
      issues,
      translations: input.translations,
    })
    rows.push({
      entityId: assignment.entity_id,
      entityKind,
      publicSlug: assignment.public_slug,
      salesChannelId: assignment.sales_channel_id,
      sourceProjection: source ?? null,
      translationProjection: skTranslationProjection(
        input.translations,
        new Set([
          `${SK_TRANSLATION_CONTRACT[entityKind].reference}:${assignment.entity_id}`,
        ])
      ),
    })
  }

  return counts
}

const auditSkPublication = (
  input: RoCatalogReadinessInput,
  issues: RoCatalogReadinessIssue[]
) => {
  const rows: SkPublicationBaselineRow[] = []
  const products = auditSkProductPublications(input, issues, rows)
  const assignedCounts = auditSkAssignedPublications(input, issues, rows)
  rows.sort((left, right) =>
    stableJson(left).localeCompare(stableJson(right), "en")
  )
  return { counts: { ...assignedCounts, products }, rows }
}

export const buildSkPublicationBaseline = (
  input: RoCatalogReadinessInput
): SkPublicationBaseline => buildSkPublicationAuditBaseline(input).baseline

export const buildSharedInventoryBaseline = (
  input: RoCatalogReadinessInput
): SharedInventoryBaseline => {
  const variantIds = new Set(
    input.products.flatMap((product) =>
      product.variants.map((variant) => variant.id)
    )
  )
  const links = (input.inventoryItemLinks ?? []).filter((link) =>
    variantIds.has(link.variant_id)
  )
  const linkedItemIds = new Set(links.map((link) => link.inventory_item_id))
  const levels = (input.inventoryLevels ?? []).filter((level) =>
    linkedItemIds.has(level.inventory_item_id)
  )
  const projection = sortByStableJson(
    input.products.flatMap((product) =>
      product.variants.map((variant) => ({
        allowBackorder: variant.allow_backorder ?? null,
        inventoryLinks: sortByStableJson(
          links
            .filter((link) => link.variant_id === variant.id)
            .map((link) => ({
              inventoryItemId: link.inventory_item_id,
              inventoryLevels: sortByStableJson(
                levels
                  .filter(
                    (level) =>
                      level.inventory_item_id === link.inventory_item_id
                  )
                  .map((level) => ({
                    incomingQuantity: level.incoming_quantity ?? null,
                    locationId: level.location_id,
                    reservedQuantity: level.reserved_quantity ?? null,
                    stockedQuantity: level.stocked_quantity ?? null,
                  }))
              ),
              requiredQuantity: link.required_quantity ?? null,
            }))
        ),
        manageInventory: variant.manage_inventory ?? null,
        productId: product.id,
        variantEan: variant.ean ?? null,
        variantId: variant.id,
        variantSku: variant.sku ?? null,
      }))
    )
  )
  return {
    count: projection.length,
    sha256: createHash("sha256").update(stableJson(projection)).digest("hex"),
  }
}

export const buildSkPublicationAuditBaseline = (
  input: RoCatalogReadinessInput
) => {
  const issues: RoCatalogReadinessIssue[] = []
  const audited = auditSkPublication(input, issues)
  const serialized = JSON.stringify(canonicalizeForHash(audited.rows))
  return {
    baseline: {
      count: audited.rows.length,
      sha256: createHash("sha256").update(serialized).digest("hex"),
    },
    issues,
    publication: {
      ...audited.counts,
      errors: issues.filter((issue) => issue.severity === "error").length,
    },
    sharedInventoryBaseline: buildSharedInventoryBaseline(input),
  }
}

export const assertFreshRoDatabaseInstanceFingerprint = (
  expected: string,
  environment: NodeJS.ProcessEnv = process.env
) => {
  if (!SHA256.test(expected)) {
    throw new Error("Expected database instance fingerprint is invalid")
  }
  const observed = buildRoDemoDatabaseInstanceFingerprint(environment)
  if (observed !== expected) {
    throw new Error(
      "Fresh database instance does not match the cutover receipt"
    )
  }
  return observed
}

const readRequiredFlag = (args: readonly string[], name: string) => {
  const prefix = `${name}=`
  const values: string[] = []
  for (const [index, argument] of args.entries()) {
    if (argument.startsWith(prefix)) {
      values.push(argument.slice(prefix.length))
      continue
    }
    if (argument === name) {
      const value = args[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing required ${name} value`)
      }
      values.push(value)
    }
  }
  if (values.length === 0 || !values[0]) {
    throw new Error(`Missing required ${name} value`)
  }
  if (values.length !== 1) {
    throw new Error(`${name} must be provided exactly once`)
  }
  return values[0]
}

const readOptionalFlag = (args: readonly string[], name: string) => {
  const prefix = `${name}=`
  return args.some(
    (argument) => argument === name || argument.startsWith(prefix)
  )
    ? readRequiredFlag(args, name)
    : undefined
}

export const parseExpectedSkBaselineArgs = (
  args: readonly string[] = []
): SkPublicationBaseline => {
  const sha256 = readRequiredFlag(args, "--expected-sk-baseline-hash")
  const countValue = readRequiredFlag(args, "--expected-sk-baseline-count")
  const count = Number(countValue)
  if (!SHA256.test(sha256)) {
    throw new Error(
      "--expected-sk-baseline-hash must be a lowercase SHA-256 value"
    )
  }
  if (
    !(Number.isSafeInteger(count) && count >= 0 && `${count}` === countValue)
  ) {
    throw new Error(
      "--expected-sk-baseline-count must be a non-negative safe integer"
    )
  }
  return { count, sha256 }
}

export const parseExpectedSharedInventoryBaselineArgs = (
  args: readonly string[] = []
): SharedInventoryBaseline => {
  const sha256 = readRequiredFlag(args, "--expected-inventory-baseline-hash")
  const countValue = readRequiredFlag(
    args,
    "--expected-inventory-baseline-count"
  )
  const count = Number(countValue)
  if (!SHA256.test(sha256)) {
    throw new Error(
      "--expected-inventory-baseline-hash must be a lowercase SHA-256"
    )
  }
  if (
    !(Number.isSafeInteger(count) && count >= 0 && `${count}` === countValue)
  ) {
    throw new Error(
      "--expected-inventory-baseline-count must be a non-negative safe integer"
    )
  }
  return { count, sha256 }
}

export const parseReadinessOutputPath = (args: readonly string[] = []) => {
  const outputPath = readRequiredFlag(args, "--output")
  if (!isAbsolute(outputPath)) {
    throw new Error("--output must be an absolute path")
  }
  if (extname(outputPath).toLocaleLowerCase("en") !== ".json") {
    throw new Error("--output must target a .json file")
  }
  return outputPath
}

export const parseExpectedScopePlanPath = (args: readonly string[] = []) => {
  const path = readRequiredFlag(args, "--expected-scope-plan")
  if (!isAbsolute(path) || extname(path).toLocaleLowerCase("en") !== ".json") {
    throw new Error("--expected-scope-plan must be an absolute .json path")
  }
  return path
}

export const parseCutoverReceiptArgs = (args: readonly string[] = []) => {
  const path = readRequiredFlag(args, "--cutover-receipt")
  const expectedSha256 = readRequiredFlag(
    args,
    "--expected-cutover-receipt-hash"
  )
  if (!isAbsolute(path) || extname(path).toLocaleLowerCase("en") !== ".json") {
    throw new Error("--cutover-receipt must be an absolute .json path")
  }
  if (!SHA256.test(expectedSha256)) {
    throw new Error(
      "--expected-cutover-receipt-hash must be a lowercase SHA-256"
    )
  }
  return { expectedSha256, path }
}

export const parseReadinessMode = (
  args: readonly string[] = []
): RoReadinessMode => {
  const mode = readOptionalFlag(args, "--readiness-mode") ?? "production"
  if (mode !== "production" && mode !== "demo") {
    throw new Error("--readiness-mode must be production or demo")
  }
  return mode
}

export const parseDemoOmissionLedgerPath = (
  args: readonly string[] = [],
  mode = parseReadinessMode(args)
) => {
  const ledgerPath = readOptionalFlag(args, "--demo-omission-ledger")
  if (mode === "production") {
    if (ledgerPath) {
      throw new Error(
        "--demo-omission-ledger is forbidden in production readiness mode"
      )
    }
    return
  }
  if (!ledgerPath) {
    throw new Error("Demo readiness requires --demo-omission-ledger")
  }
  if (!isAbsolute(ledgerPath) || extname(ledgerPath) !== ".json") {
    throw new Error("--demo-omission-ledger must be an absolute .json path")
  }
  return ledgerPath
}

const exactLedgerKeys = (
  value: UnknownRecord,
  expected: readonly string[],
  path: string
) => {
  const actual = Object.keys(value).sort()
  const canonicalExpected = [...expected].sort()
  if (stableJson(actual) !== stableJson(canonicalExpected)) {
    throw new Error(`${path} has invalid keys`)
  }
}

const officialSourceUrl = (value: unknown) => {
  if (!hasText(value) || value !== value.trim()) {
    return false
  }
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (url.hostname === "herbatica.ro" ||
        url.hostname.endsWith(".herbatica.ro"))
    )
  } catch {
    return false
  }
}

export const parseRoDemoContentOmissionLedger = (
  value: unknown
): RoDemoContentOmissionLedger => {
  if (!isRecord(value)) {
    throw new Error("Demo omission ledger must be an object")
  }
  exactLedgerKeys(value, ["entries", "mode", "schemaVersion"], "ledger")
  if (
    value.schemaVersion !== 1 ||
    value.mode !== "official-ro-description-only" ||
    !Array.isArray(value.entries)
  ) {
    throw new Error("Demo omission ledger header is invalid")
  }
  const entries = value.entries.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`ledger.entries[${index}] must be an object`)
    }
    exactLedgerKeys(
      candidate,
      [
        "omittedFields",
        "productContentId",
        "productId",
        "roDescriptionSha256",
        "sourceContentSha256",
        "sourceUrl",
      ],
      `ledger.entries[${index}]`
    )
    const omittedFields = candidate.omittedFields
    const requiredFields = new Set<string>(PRODUCT_CONTENT_TRANSLATABLE_FIELDS)
    if (
      !Array.isArray(omittedFields) ||
      omittedFields.length !== requiredFields.size ||
      new Set(omittedFields).size !== requiredFields.size ||
      !omittedFields.every(
        (field) => typeof field === "string" && requiredFields.has(field)
      )
    ) {
      throw new Error(
        `ledger.entries[${index}].omittedFields must contain every structured field exactly once`
      )
    }
    if (
      !hasText(candidate.productId) ||
      candidate.productId !== candidate.productId.trim() ||
      !hasText(candidate.productContentId) ||
      candidate.productContentId !== candidate.productContentId.trim() ||
      !SHA256.test(candidate.roDescriptionSha256 as string) ||
      !SHA256.test(candidate.sourceContentSha256 as string) ||
      !officialSourceUrl(candidate.sourceUrl)
    ) {
      throw new Error(`ledger.entries[${index}] provenance is invalid`)
    }
    return {
      omittedFields: PRODUCT_CONTENT_TRANSLATABLE_FIELDS.filter((field) =>
        omittedFields.includes(field)
      ),
      productContentId: candidate.productContentId,
      productId: candidate.productId,
      roDescriptionSha256: candidate.roDescriptionSha256,
      sourceContentSha256: candidate.sourceContentSha256,
      sourceUrl: candidate.sourceUrl,
    } as RoDemoContentOmission
  })
  const productIds = entries.map(({ productId }) => productId)
  const contentIds = entries.map(({ productContentId }) => productContentId)
  if (
    new Set(productIds).size !== productIds.length ||
    new Set(contentIds).size !== contentIds.length
  ) {
    throw new Error(
      "Demo omission ledger contains duplicate product identities"
    )
  }
  return {
    entries: sortByStableJson(entries),
    mode: "official-ro-description-only",
    schemaVersion: 1,
  }
}

export const readRoDemoContentOmissionLedger = async (path: string) =>
  parseRoDemoContentOmissionLedger(JSON.parse(await readFile(path, "utf8")))

export const writeRoCatalogReadinessReport = async (
  outputPath: string,
  report: RoCatalogReadinessReport
) => {
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(`${JSON.stringify(report, null, 2)}\n`, "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    await createHardLink(temporaryPath, outputPath)
    await unlink(temporaryPath)
  } catch (error) {
    await handle?.close().catch(() => null)
    await unlink(temporaryPath).catch(() => null)
    throw error
  }
}

const auditRegions = (
  regions: readonly RoCatalogAuditRegion[],
  paymentProviderLinks: readonly RoCatalogAuditPaymentProviderLink[],
  paymentProviders: readonly RoCatalogAuditPaymentProvider[],
  issues: RoCatalogReadinessIssue[]
) => {
  const regionsForRomania = regions.filter((region) =>
    (region.countries ?? []).some(
      (country) => normalize(country.iso_2) === RO_COUNTRY
    )
  )
  if (regionsForRomania.length !== 1) {
    addIssue(issues, {
      code: "RO_REGION_CARDINALITY_INVALID",
      entityKind: "region",
      message: `Expected exactly one active region for Romania, found ${regionsForRomania.length}.`,
      severity: "error",
    })
  }
  for (const region of regionsForRomania) {
    if (normalize(region.currency_code) === RO_CURRENCY) {
      continue
    }
    addIssue(issues, {
      code: "RO_REGION_CURRENCY_NOT_RON",
      entityId: region.id,
      entityKind: "region",
      message: `Romanian region ${region.name} uses ${region.currency_code ?? "no currency"}; expected RON.`,
      severity: "error",
    })
  }
  const regionIds = new Set(regionsForRomania.map((region) => region.id))
  const enabledProviderIds = new Set(
    paymentProviders
      .filter((provider) => provider.is_enabled === true)
      .map((provider) => provider.id)
  )
  const regionPaymentProviders = new Set(
    paymentProviderLinks
      .filter(
        (link) =>
          regionIds.has(link.region_id) &&
          enabledProviderIds.has(link.payment_provider_id)
      )
      .map((link) => link.payment_provider_id)
  ).size
  if (regionsForRomania.length === 1 && regionPaymentProviders === 0) {
    addIssue(issues, {
      code: "RO_REGION_HAS_NO_PAYMENT_PROVIDER",
      entityId: regionsForRomania[0]?.id,
      entityKind: "region",
      message: "Romanian region has no linked and enabled payment provider.",
      severity: "error",
    })
  }
  return { regionPaymentProviders, regionsForRomania: regionsForRomania.length }
}

const auditShipping = (
  shippingOptions: readonly RoCatalogAuditShippingOption[],
  shippingPriceSets: readonly RoCatalogAuditShippingPriceSet[],
  issues: RoCatalogReadinessIssue[]
) => {
  const roShippingOptions = shippingOptions.filter((option) =>
    (option.service_zone?.geo_zones ?? []).some(
      (zone) => normalize(zone.country_code) === RO_COUNTRY
    )
  )
  if (roShippingOptions.length === 0) {
    addIssue(issues, {
      code: "RO_HAS_NO_SHIPPING_OPTION",
      entityKind: "region",
      message: "No shipping option has a service-zone geo zone for Romania.",
      severity: "error",
    })
  }
  const roShippingOptionIds = new Set(
    roShippingOptions.map((option) => option.id)
  )
  const roShippingOptionsWithRonPrice = new Set(
    shippingPriceSets
      .filter(
        (link) =>
          roShippingOptionIds.has(link.shipping_option_id) &&
          (link.price_set?.prices ?? []).some(
            (price) => normalize(price.currency_code) === RO_CURRENCY
          )
      )
      .map((link) => link.shipping_option_id)
  ).size
  if (
    roShippingOptions.length > 0 &&
    roShippingOptionsWithRonPrice !== roShippingOptions.length
  ) {
    addIssue(issues, {
      code: "RO_SHIPPING_OPTION_MISSING_RON_PRICE",
      entityKind: "price",
      message: `${roShippingOptions.length - roShippingOptionsWithRonPrice} Romanian shipping option(s) have no RON price.`,
      severity: "error",
    })
  }
  return {
    roShippingOptions: roShippingOptions.length,
    roShippingOptionsWithRonPrice,
  }
}

const auditTax = (
  taxRegions: readonly RoCatalogAuditTaxRegion[],
  taxRates: readonly RoCatalogAuditTaxRate[],
  issues: RoCatalogReadinessIssue[]
) => {
  const roTaxRegions = taxRegions.filter(
    (region) =>
      normalize(region.country_code) === RO_COUNTRY && !region.province_code
  )
  const roTaxRegionIds = new Set(roTaxRegions.map((region) => region.id))
  const roTaxRates = taxRates.filter(
    (rate) =>
      roTaxRegionIds.has(rate.tax_region_id) &&
      rate.is_default === true &&
      Number(rate.rate) > 0
  )
  if (roTaxRegions.length !== 1) {
    addIssue(issues, {
      code: "RO_TAX_REGION_CARDINALITY_INVALID",
      entityKind: "region",
      message: `Expected exactly one country-level RO tax region, found ${roTaxRegions.length}.`,
      severity: "error",
    })
  }
  if (roTaxRegions.length === 1 && roTaxRates.length === 0) {
    addIssue(issues, {
      code: "RO_TAX_REGION_HAS_NO_DEFAULT_RATE",
      entityId: roTaxRegions[0]?.id,
      entityKind: "region",
      message: "Romanian tax region has no positive default tax rate.",
      severity: "error",
    })
  }
  return { roTaxRates: roTaxRates.length, roTaxRegions: roTaxRegions.length }
}

export const buildRoCatalogReadinessReport = (
  input: RoCatalogReadinessInput,
  expectedSkBaseline: SkPublicationBaseline,
  generatedAt = new Date().toISOString(),
  provenanceOrOptions:
    | RoReadinessProvenance
    | Readonly<{
        expectedScopePlanHash: string
        expectedImportPlanHash?: string
        expectedScopePlan?: RoCatalogScopePlan
        cutoverChainProof?: RoCutoverChainProof
        expectedVariantExpectations?: readonly RoVariantAvailabilityExpectation[]
        expectedSharedInventoryBaseline?: SharedInventoryBaseline
        provenance: RoReadinessProvenance
      }> = "in-memory-audit-input"
): RoCatalogReadinessReport => {
  const provenance =
    typeof provenanceOrOptions === "string"
      ? provenanceOrOptions
      : provenanceOrOptions.provenance
  const expectedScopePlanHash =
    typeof provenanceOrOptions === "string"
      ? undefined
      : provenanceOrOptions.expectedScopePlanHash
  const expectedScopePlan =
    typeof provenanceOrOptions === "string"
      ? undefined
      : provenanceOrOptions.expectedScopePlan
  const expectedImportPlanHash =
    typeof provenanceOrOptions === "string"
      ? undefined
      : provenanceOrOptions.expectedImportPlanHash
  const cutoverChainProof =
    typeof provenanceOrOptions === "string"
      ? undefined
      : provenanceOrOptions.cutoverChainProof
  const expectedVariantExpectations =
    typeof provenanceOrOptions === "string"
      ? undefined
      : provenanceOrOptions.expectedVariantExpectations
  const observedSharedInventoryBaseline = buildSharedInventoryBaseline(input)
  const expectedSharedInventoryBaseline =
    typeof provenanceOrOptions === "string"
      ? observedSharedInventoryBaseline
      : (provenanceOrOptions.expectedSharedInventoryBaseline ??
        observedSharedInventoryBaseline)
  const sharedInventoryBaselineMatched =
    observedSharedInventoryBaseline.count ===
      expectedSharedInventoryBaseline.count &&
    observedSharedInventoryBaseline.sha256 ===
      expectedSharedInventoryBaseline.sha256
  const observedSkBaseline = buildSkPublicationBaseline(input)
  const issues: RoCatalogReadinessIssue[] = []
  if (!sharedInventoryBaselineMatched) {
    addIssue(issues, {
      code: "SHARED_INVENTORY_BASELINE_MISMATCH",
      entityKind: "catalog",
      message: `Fresh shared inventory baseline ${observedSharedInventoryBaseline.count}:${observedSharedInventoryBaseline.sha256} does not match expected ${expectedSharedInventoryBaseline.count}:${expectedSharedInventoryBaseline.sha256}.`,
      severity: "error",
    })
  }
  const readinessMode = input.readinessMode ?? "production"
  if (readinessMode === "demo" && !input.demoContentOmissions) {
    addIssue(issues, {
      code: "RO_DEMO_OMISSION_LEDGER_MISSING",
      entityKind: "catalog",
      message: "Demo readiness requires an explicit content-omission ledger.",
      severity: "error",
    })
  }
  if (
    readinessMode === "production" &&
    (input.demoContentOmissions?.length ?? 0) > 0
  ) {
    addIssue(issues, {
      code: "RO_DEMO_OMISSION_FORBIDDEN_IN_PRODUCTION",
      entityKind: "catalog",
      message: "Production readiness cannot accept demo content omissions.",
      severity: "error",
    })
  }
  const skBaselineMatched =
    expectedSkBaseline.count === observedSkBaseline.count &&
    expectedSkBaseline.sha256 === observedSkBaseline.sha256
  if (!skBaselineMatched) {
    addIssue(issues, {
      code: "SK_BASELINE_MISMATCH",
      entityKind: "catalog",
      message: `Fresh post-apply SK publication baseline ${observedSkBaseline.count}:${observedSkBaseline.sha256} does not match expected pre-apply baseline ${expectedSkBaseline.count}:${expectedSkBaseline.sha256}.`,
      severity: "error",
    })
  }
  const skIssueStart = issues.length
  const skPublication = auditSkPublication(input, issues)
  const skErrors = issues
    .slice(skIssueStart)
    .filter((issue) => issue.severity === "error").length
  const translationIndex = buildTranslationIndex(input.translations, issues)
  const publicSlugs: PublicSlugEntry[] = []
  const productScope = selectRoPublishedProducts(input.products, issues)
  const activeCategories = input.categories.filter(
    (category) => category.is_active !== false
  )
  const productCounts = auditProducts({
    expectedVariantExpectations,
    input,
    issues,
    products: productScope.published,
    publicSlugs,
    translationIndex,
  })
  const reviewedNeutralEqualities =
    input.reviewedNeutralEqualities ?? REVIEWED_RO_NEUTRAL_EQUALITIES
  const categoryCounts = auditCategories({
    activeCategories,
    assignments: input.assignments,
    issues,
    publicSlugs,
    reviewedNeutralEqualities,
    translationIndex,
  })
  const assignedCatalogCounts = auditAssignedBrandsAndCollections({
    expectedBrandExcludedIds: expectedScopePlan?.brandExcludedIds ?? [],
    input,
    issues,
    publicSlugs,
    reviewedNeutralEqualities,
    translationIndex,
  })
  checkDuplicateSlugs(publicSlugs, issues)
  const regionCounts = auditRegions(
    input.regions,
    input.regionPaymentProviderLinks,
    input.paymentProviders,
    issues
  )
  const shippingCounts = auditShipping(
    input.shippingOptions,
    input.shippingPriceSets,
    issues
  )
  const taxCounts = auditTax(input.taxRegions, input.taxRates, issues)
  const observedScopePlan: RoCatalogScopePlan = {
    brandExcludedIds: assignedCatalogCounts.excludedBrandIds,
    brandIds: assignedCatalogCounts.brandIds,
    categoryExcludedIds: categoryCounts.excluded.map(({ id }) => id).sort(),
    categoryPublishedIds: categoryCounts.publishedCategoryIds,
    collectionIds: assignedCatalogCounts.collectionIds,
    productExcludedIds: productScope.excluded.map(({ id }) => id).sort(),
    productPublishedIds: productScope.published.map(({ id }) => id).sort(),
  }
  const observedScopePlanHash = buildRoCatalogScopePlanHash(observedScopePlan)
  const resolvedExpectedScopePlanHash =
    expectedScopePlanHash ?? observedScopePlanHash
  const scopePlanMatched =
    resolvedExpectedScopePlanHash === observedScopePlanHash
  if (!scopePlanMatched) {
    addIssue(issues, {
      code: "RO_SCOPE_PLAN_MISMATCH",
      entityKind: "catalog",
      message: `Fresh RO publication identity scope ${observedScopePlanHash} does not match importer plan scope ${resolvedExpectedScopePlanHash}.`,
      severity: "error",
    })
  }
  if (provenance === "fresh-medusa-database-read" && !cutoverChainProof) {
    addIssue(issues, {
      code: "CUTOVER_CHAIN_PROOF_MISSING",
      entityKind: "catalog",
      message:
        "Fresh production readiness requires a validated cutover receipt and operation convergence proof.",
      severity: "error",
    })
  }
  const errors = issues.filter((issue) => issue.severity === "error").length
  const warnings = issues.length - errors
  return {
    cutoverChainProof: cutoverChainProof ?? {
      catalogPlanHash: expectedImportPlanHash ?? resolvedExpectedScopePlanHash,
      commerceManifestSha256: resolvedExpectedScopePlanHash,
      commercePlanSha256: resolvedExpectedScopePlanHash,
      databaseInstanceFingerprint: resolvedExpectedScopePlanHash,
      matched: true,
      maintenanceProofSha256: resolvedExpectedScopePlanHash,
      meilisearchConvergenceSha256: resolvedExpectedScopePlanHash,
      postCommerceEnvelopeSha256: resolvedExpectedScopePlanHash,
      receiptSha256: resolvedExpectedScopePlanHash,
      releaseId: "ro-demo-in-memory-audit",
      schemaVersion: 1,
      scopeSha256: resolvedExpectedScopePlanHash,
      staticTaxonomyConvergenceSha256: resolvedExpectedScopePlanHash,
      urlRegistryConvergenceSha256: resolvedExpectedScopePlanHash,
    },
    generatedAt,
    issues,
    market: RO_MARKET,
    ready: errors === 0,
    readinessMode,
    roCatalogPublication: {
      brandIds: assignedCatalogCounts.brandIds,
      categoryIds: categoryCounts.publishedCategoryIds,
      collectionIds: assignedCatalogCounts.collectionIds,
    },
    roBrandScope: {
      excluded: assignedCatalogCounts.excludedBrandIds.length,
      excludedIds: assignedCatalogCounts.excludedBrandIds,
      global: input.brands.length,
      published: assignedCatalogCounts.brandIds.length,
      publishedIds: assignedCatalogCounts.brandIds,
    },
    roCompletenessProof: {
      algorithm: "sha256-canonical-json-v1",
      dataHash: buildRoReadinessDataHash(input),
      demoOmissionLedgerHash:
        readinessMode === "demo"
          ? buildDemoOmissionLedgerHash(input.demoContentOmissions ?? [])
          : null,
      locale: RO_LOCALE,
      provenance,
      schemaVersion: 1,
    },
    skBaseline: {
      expected: expectedSkBaseline,
      matched: skBaselineMatched,
      observed: observedSkBaseline,
    },
    skPublication: {
      ...skPublication.counts,
      errors: skErrors,
    },
    scope: "ro-published-products-and-catalog-assignments",
    roProductScope: {
      draft: productScope.draft,
      excluded: productScope.excluded,
      globalPublished: productScope.globalPublished,
      invalid: productScope.invalid,
      published: productScope.published.length,
      publishedIds: observedScopePlan.productPublishedIds,
      unassigned: productScope.unassigned,
    },
    roVariantScope: {
      dataHash: hashRoVariantAvailabilityExpectations(
        expectedVariantExpectations ?? []
      ),
      sellable: productCounts.sellableVariants,
      unavailable: productCounts.unavailableVariants,
    },
    roCategoryScope: {
      active: activeCategories.length,
      authoritySha256: REVIEWED_RO_CATEGORY_AUTHORITY_SHA256,
      draft: categoryCounts.excluded.filter(({ state }) => state === "draft")
        .length,
      excluded: categoryCounts.excluded,
      invalid: categoryCounts.invalid,
      published: categoryCounts.publishedCategoryIds.length,
      translated: categoryCounts.categoryLocalizedContentContracts,
      unassigned:
        categoryCounts.unassigned +
        categoryCounts.excluded.filter(({ state }) => state === "unassigned")
          .length,
    },
    scopePlanProof: {
      expectedDataHash: resolvedExpectedScopePlanHash,
      importPlanHash: expectedImportPlanHash ?? resolvedExpectedScopePlanHash,
      matched: scopePlanMatched,
      observedDataHash: observedScopePlanHash,
      schemaVersion: 1,
    },
    sharedInventoryBaseline: {
      expected: expectedSharedInventoryBaseline,
      matched: sharedInventoryBaselineMatched,
      observed: observedSharedInventoryBaseline,
    },
    summary: {
      brands: assignedCatalogCounts.brandIds.length,
      brandUrlAssignments: assignedCatalogCounts.brandIds.length,
      categories: activeCategories.length,
      categoryLocalizedContentContracts:
        categoryCounts.categoryLocalizedContentContracts,
      categoryUrlAssignments: categoryCounts.categoryUrlAssignments,
      demoContentOmissionFields: productCounts.demoContentOmissionFields,
      demoOmissionLedgerEntries: input.demoContentOmissions?.length ?? 0,
      demoProductsWithContentOmissions:
        productCounts.demoProductsWithContentOmissions,
      collections: assignedCatalogCounts.collectionIds.length,
      collectionUrlAssignments: assignedCatalogCounts.collectionIds.length,
      errors,
      productContentRecords: input.productContents.filter((content) =>
        productScope.published.some(
          (product) => product.id === content.product_id
        )
      ).length,
      products: productScope.published.length,
      productUrlAssignments: productCounts.productUrlAssignments,
      regionPaymentProviders: regionCounts.regionPaymentProviders,
      regionsForRomania: regionCounts.regionsForRomania,
      reviewedNeutralEqualitiesUsed:
        productCounts.reviewedNeutralEqualitiesUsed +
        categoryCounts.reviewedNeutralEqualitiesUsed +
        assignedCatalogCounts.reviewedNeutralEqualitiesUsed,
      roShippingOptions: shippingCounts.roShippingOptions,
      roShippingOptionsWithRonPrice:
        shippingCounts.roShippingOptionsWithRonPrice,
      roTaxRates: taxCounts.roTaxRates,
      roTaxRegions: taxCounts.roTaxRegions,
      translations: input.translations.filter(
        (translation) =>
          translation.locale_code === RO_LOCALE && !translation.deleted_at
      ).length,
      variants: productCounts.variants,
      variantsWithRonPrice: productCounts.variantsWithRonPrice,
      warnings,
    },
  }
}

type GraphQuery = Readonly<{
  graph: (
    input: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: UnknownRecord
      pagination?: Readonly<{ skip: number; take: number }>
    }>
  ) => Promise<Readonly<{ data?: unknown[] }>>
}>

const readAllGraphRows = async (
  query: GraphQuery,
  entity: string,
  fields: readonly string[],
  filters?: UnknownRecord
) => {
  const rows: unknown[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const result = await query.graph({
      entity,
      fields,
      filters,
      pagination: { skip, take: PAGE_SIZE },
    })
    const page = result.data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) {
      return rows
    }
  }
}

const readAllTranslations = async (
  service: ITranslationModuleService,
  reference: string,
  localeCode: typeof RO_LOCALE | typeof SK_LOCALE
) => {
  const translations: RoCatalogAuditTranslation[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await service.listTranslations(
      { locale_code: localeCode, reference },
      { skip, take: PAGE_SIZE }
    )
    translations.push(...(page as RoCatalogAuditTranslation[]))
    if (page.length < PAGE_SIZE) {
      return translations
    }
  }
}

const readAllAssignments = async (
  service: StorefrontUrlAssignmentModuleService
) => {
  const assignments: RoCatalogAuditAssignment[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await service.listStorefrontUrlAssignments(
      {},
      { skip, take: PAGE_SIZE }
    )
    assignments.push(...(page as RoCatalogAuditAssignment[]))
    if (page.length < PAGE_SIZE) {
      return assignments
    }
  }
}

const readAllShippingOptions = async (service: IFulfillmentModuleService) => {
  const options: RoCatalogAuditShippingOption[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await service.listShippingOptions(
      {},
      {
        relations: ["service_zone", "service_zone.geo_zones"],
        skip,
        take: PAGE_SIZE,
      }
    )
    options.push(...(page as RoCatalogAuditShippingOption[]))
    if (page.length < PAGE_SIZE) {
      return options
    }
  }
}

const readAllTaxRegions = async (service: ITaxModuleService) => {
  const regions: RoCatalogAuditTaxRegion[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await service.listTaxRegions({}, { skip, take: PAGE_SIZE })
    regions.push(...(page as RoCatalogAuditTaxRegion[]))
    if (page.length < PAGE_SIZE) {
      return regions
    }
  }
}

const readAllTaxRates = async (service: ITaxModuleService) => {
  const rates: RoCatalogAuditTaxRate[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await service.listTaxRates({}, { skip, take: PAGE_SIZE })
    rates.push(...(page as RoCatalogAuditTaxRate[]))
    if (page.length < PAGE_SIZE) {
      return rates
    }
  }
}

const assertGraphRows = <Value>(
  rows: readonly unknown[],
  entity: string
): Value[] => {
  if (!rows.every(isRecord)) {
    throw new Error(`RO readiness audit received invalid ${entity} rows`)
  }
  return rows as Value[]
}

export const collectRoCatalogReadinessInput = async (
  container: ExecArgs["container"]
): Promise<RoCatalogReadinessInput> => {
  const query = container.resolve<GraphQuery>(ContainerRegistrationKeys.QUERY)
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const taxService = container.resolve<ITaxModuleService>(Modules.TAX)
  const [
    products,
    brands,
    categories,
    collections,
    productContents,
    inventoryItemLinks,
    inventoryLevels,
    regions,
    paymentProviders,
    regionPaymentProviderLinks,
    shippingOptions,
    shippingPriceSets,
    taxRegions,
    taxRates,
    productTranslations,
    categoryTranslations,
    brandTranslations,
    collectionTranslations,
    productContentTranslations,
    skProductTranslations,
    skProductContentTranslations,
    skCategoryTranslations,
    skBrandTranslations,
    skCollectionTranslations,
    assignments,
  ] = await Promise.all([
    readAllGraphRows(
      query,
      "product",
      [
        "id",
        "external_id",
        "handle",
        "title",
        "subtitle",
        "description",
        "collection_id",
        "brand.id",
        "categories.id",
        "metadata",
        "updated_at",
        "sales_channels.id",
        "variants.id",
        "variants.allow_backorder",
        "variants.manage_inventory",
        "variants.title",
        "variants.sku",
        "variants.ean",
        "variants.prices.amount",
        "variants.prices.currency_code",
      ],
      { status: ProductStatus.PUBLISHED }
    ),
    readAllGraphRows(query, "brand", [
      "id",
      "title",
      "handle",
      "gpsr_contact_email",
      "gpsr_european_reseller_contact_email",
      "gpsr_european_reseller_manufacturing_company_name",
      "gpsr_european_reseller_postal_address",
      "gpsr_manufactured_outside_eu",
      "gpsr_manufacturing_company_name",
      "gpsr_postal_address",
    ]),
    readAllGraphRows(query, "product_category", [
      "id",
      "name",
      "description",
      "handle",
      "is_active",
      "metadata",
      "parent_category_id",
    ]),
    readAllGraphRows(query, "product_collection", [
      "id",
      "title",
      "handle",
      "metadata",
    ]),
    readAllGraphRows(query, "product_content", [
      "id",
      "product_id",
      ...PRODUCT_CONTENT_TRANSLATABLE_FIELDS,
    ]),
    readAllGraphRows(query, "product_variant_inventory_item", [
      "variant_id",
      "inventory_item_id",
      "required_quantity",
    ]),
    readAllGraphRows(query, "inventory_level", [
      "inventory_item_id",
      "location_id",
      "incoming_quantity",
      "reserved_quantity",
      "stocked_quantity",
    ]),
    readAllGraphRows(query, "region", [
      "id",
      "name",
      "currency_code",
      "countries.iso_2",
    ]),
    readAllGraphRows(query, "payment_provider", ["id", "is_enabled"]),
    readAllGraphRows(query, "region_payment_provider", [
      "region_id",
      "payment_provider_id",
    ]),
    readAllShippingOptions(fulfillmentService),
    readAllGraphRows(query, "shipping_option_price_set", [
      "shipping_option_id",
      "price_set.prices.currency_code",
    ]),
    readAllTaxRegions(taxService),
    readAllTaxRates(taxService),
    readAllTranslations(translationService, "product", RO_LOCALE),
    readAllTranslations(translationService, "product_category", RO_LOCALE),
    readAllTranslations(translationService, "brand", RO_LOCALE),
    readAllTranslations(translationService, "product_collection", RO_LOCALE),
    readAllTranslations(translationService, "product_content", RO_LOCALE),
    readAllTranslations(translationService, "product", SK_LOCALE),
    readAllTranslations(translationService, "product_content", SK_LOCALE),
    readAllTranslations(translationService, "product_category", SK_LOCALE),
    readAllTranslations(translationService, "brand", SK_LOCALE),
    readAllTranslations(translationService, "product_collection", SK_LOCALE),
    readAllAssignments(assignmentService),
  ])

  return {
    assignments,
    brands: assertGraphRows<RoCatalogAuditBrand>(brands, "brand"),
    categories: assertGraphRows<RoCatalogAuditCategory>(
      categories,
      "product_category"
    ),
    collections: assertGraphRows<RoCatalogAuditCollection>(
      collections,
      "product_collection"
    ),
    inventoryItemLinks: assertGraphRows<RoCatalogAuditInventoryItemLink>(
      inventoryItemLinks,
      "product_variant_inventory_item"
    ),
    inventoryLevels: assertGraphRows<RoCatalogAuditInventoryLevel>(
      inventoryLevels,
      "inventory_level"
    ),
    productContents: assertGraphRows<RoCatalogAuditProductContent>(
      productContents,
      "product_content"
    ),
    products: assertGraphRows<RoCatalogAuditProduct>(products, "product"),
    paymentProviders: assertGraphRows<RoCatalogAuditPaymentProvider>(
      paymentProviders,
      "payment_provider"
    ),
    regionPaymentProviderLinks:
      assertGraphRows<RoCatalogAuditPaymentProviderLink>(
        regionPaymentProviderLinks,
        "region_payment_provider"
      ),
    regions: assertGraphRows<RoCatalogAuditRegion>(regions, "region"),
    shippingOptions,
    shippingPriceSets: assertGraphRows<RoCatalogAuditShippingPriceSet>(
      shippingPriceSets,
      "shipping_option_price_set"
    ),
    taxRates,
    taxRegions,
    translations: [
      ...productTranslations,
      ...categoryTranslations,
      ...brandTranslations,
      ...collectionTranslations,
      ...productContentTranslations,
      ...skProductTranslations,
      ...skProductContentTranslations,
      ...skCategoryTranslations,
      ...skBrandTranslations,
      ...skCollectionTranslations,
    ],
  }
}

export default async function auditRoCatalogReadiness({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  logger.info("[RO catalog readiness] Starting read-only audit")
  const expectedSkBaseline = parseExpectedSkBaselineArgs(args)
  const expectedSharedInventoryBaseline =
    parseExpectedSharedInventoryBaselineArgs(args)
  const outputPath = parseReadinessOutputPath(args)
  const expectedScopePlanPath = parseExpectedScopePlanPath(args)
  const cutoverReceiptArgs = parseCutoverReceiptArgs(args)
  const readinessMode = parseReadinessMode(args)
  const omissionLedgerPath = parseDemoOmissionLedgerPath(args, readinessMode)
  const [collectedInput, omissionLedger, expectedScopePlan, cutoverReceipt] =
    await Promise.all([
      collectRoCatalogReadinessInput(container),
      omissionLedgerPath
        ? readRoDemoContentOmissionLedger(omissionLedgerPath)
        : undefined,
      readFile(expectedScopePlanPath, "utf8").then((json) =>
        parseRoCatalogScopePlanArtifact(JSON.parse(json))
      ),
      readFile(cutoverReceiptArgs.path, "utf8").then((json) =>
        parseRoTwoPhaseProvenanceReceipt(
          JSON.parse(json),
          cutoverReceiptArgs.expectedSha256
        )
      ),
    ])
  if (
    cutoverReceipt.receipt.catalog.importPlan.planHash !==
      expectedScopePlan.planHash ||
    cutoverReceipt.receipt.catalog.importPlan.scopeSha256 !==
      expectedScopePlan.hash
  ) {
    throw new Error(
      "Cutover receipt catalog plan/scope hashes do not match reviewed importer plan"
    )
  }
  assertFreshRoDatabaseInstanceFingerprint(
    cutoverReceipt.receipt.releaseIdentity.databaseInstanceFingerprint
  )
  const receiptPostCommerce = cutoverReceipt.receipt.postCommerce
  if (
    receiptPostCommerce.preCommerceSkBaselineSha256 !==
      expectedSkBaseline.sha256 ||
    receiptPostCommerce.preCommerceSkBaselineCount !==
      expectedSkBaseline.count ||
    receiptPostCommerce.preCommerceSharedInventoryFingerprintSha256 !==
      expectedSharedInventoryBaseline.sha256 ||
    receiptPostCommerce.preCommerceSharedInventoryFingerprintCount !==
      expectedSharedInventoryBaseline.count
  ) {
    throw new Error(
      "Cutover receipt SK/shared-inventory baselines do not match the explicit readiness handoff"
    )
  }
  const plannedProductIds = new Set(expectedScopePlan.scope.productPublishedIds)
  const plannedCatalogIds = {
    brand: new Set(expectedScopePlan.scope.brandIds),
    category: new Set(expectedScopePlan.scope.categoryPublishedIds),
    collection: new Set(expectedScopePlan.scope.collectionIds),
  }
  const freshRoSalesChannelIds = new Set<string>()
  for (const product of collectedInput.products) {
    if (!plannedProductIds.has(product.id)) {
      continue
    }
    const assignment = parseProductPublicationSnapshot(product).assignments.ro
    if (assignment?.publicationStatus === "published") {
      freshRoSalesChannelIds.add(assignment.salesChannelId)
    }
  }
  for (const assignment of collectedInput.assignments) {
    if (
      assignment.market_code === RO_MARKET &&
      assignment.publication_status === "published" &&
      (assignment.entity_kind === "brand" ||
        assignment.entity_kind === "category" ||
        assignment.entity_kind === "collection") &&
      plannedCatalogIds[assignment.entity_kind].has(assignment.entity_id)
    ) {
      freshRoSalesChannelIds.add(assignment.sales_channel_id)
    }
  }
  if (
    freshRoSalesChannelIds.size !== 1 ||
    !freshRoSalesChannelIds.has(
      cutoverReceipt.receipt.releaseIdentity.salesChannelId
    )
  ) {
    throw new Error(
      "Cutover receipt Sales Channel does not match the fresh RO publication authority"
    )
  }
  const input: RoCatalogReadinessInput = {
    ...collectedInput,
    ...(omissionLedger ? { demoContentOmissions: omissionLedger.entries } : {}),
    readinessMode,
  }
  const report = buildRoCatalogReadinessReport(
    input,
    expectedSkBaseline,
    new Date().toISOString(),
    {
      expectedScopePlanHash: expectedScopePlan.hash,
      expectedImportPlanHash: expectedScopePlan.planHash,
      expectedScopePlan: expectedScopePlan.scope,
      expectedVariantExpectations: expectedScopePlan.variantExpectations,
      expectedSharedInventoryBaseline,
      cutoverChainProof: {
        catalogPlanHash: expectedScopePlan.planHash,
        commerceManifestSha256:
          cutoverReceipt.receipt.postCommerce.commerceManifestSha256,
        commercePlanSha256:
          cutoverReceipt.receipt.postCommerce.commercePlanHash,
        databaseInstanceFingerprint:
          cutoverReceipt.receipt.releaseIdentity.databaseInstanceFingerprint,
        matched: true,
        maintenanceProofSha256:
          cutoverReceipt.receipt.operations.maintenance.sha256,
        meilisearchConvergenceSha256:
          cutoverReceipt.receipt.operations.meilisearchConvergence.sha256,
        postCommerceEnvelopeSha256:
          cutoverReceipt.receipt.postCommerce.envelope.sha256,
        receiptSha256: cutoverReceipt.receiptSha256,
        releaseId: cutoverReceipt.receipt.releaseId,
        schemaVersion: 1,
        scopeSha256: expectedScopePlan.hash,
        staticTaxonomyConvergenceSha256:
          cutoverReceipt.receipt.artifacts.staticTaxonomyConvergence.sha256,
        urlRegistryConvergenceSha256:
          cutoverReceipt.receipt.operations.urlRegistryConvergence.sha256,
      },
      provenance: "fresh-medusa-database-read",
    }
  )
  await writeRoCatalogReadinessReport(outputPath, report)
  logger.info(`[RO catalog readiness] ${JSON.stringify(report, null, 2)}`)
  if (!report.ready) {
    throw new Error(
      `RO_CATALOG_NOT_READY: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s)`
    )
  }
  logger.info("[RO catalog readiness] READY")
}
