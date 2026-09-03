import type { ProductPublicationAssignment } from "../../modules/url-registry-outbox/types"
import type { CatalogTranslationPlan } from "../catalog-translation-pipeline/types"

export const MARKET_CATALOG_PUBLICATION_TARGETS = {
  cz: "cs-CZ",
  hu: "hu-HU",
} as const

export type MarketCatalogPublicationMarket =
  keyof typeof MARKET_CATALOG_PUBLICATION_TARGETS

export type MarketCatalogPublicationLocale =
  (typeof MARKET_CATALOG_PUBLICATION_TARGETS)[MarketCatalogPublicationMarket]

export type MarketCatalogPublicationEntry = Readonly<{
  id: string
  publicSlug: string
  publicationStatus: "published"
}>

export type MarketCatalogPublicationManifest = Readonly<{
  brands: readonly MarketCatalogPublicationEntry[]
  categories: readonly MarketCatalogPublicationEntry[]
  environment: Readonly<{
    databaseInstanceFingerprint: string
    environmentId: string
    kind: "test"
  }>
  locale: MarketCatalogPublicationLocale
  market: MarketCatalogPublicationMarket
  products: readonly MarketCatalogPublicationEntry[]
  salesChannelId: string
  schemaVersion: 1
  translationInputSha256: string
}>

export type MarketCatalogProductSnapshot = Readonly<{
  assignments: Readonly<
    Record<"sk" | "cz" | "hu" | "ro", ProductPublicationAssignment | null>
  >
  productId: string
  salesChannelIds: readonly string[]
  sourceVersion: string
}>

export type MarketCatalogAssignmentSnapshot = Readonly<{
  entityId: string
  entityKind: "brand" | "category"
  id: string
  marketCode: MarketCatalogPublicationMarket
  publicationStatus: "draft" | "published"
  publicSlug: string
  salesChannelId: string
  sourceVersion: number
}>

export type MarketCatalogPublicationSnapshot = Readonly<{
  assignments: readonly MarketCatalogAssignmentSnapshot[]
  products: readonly MarketCatalogProductSnapshot[]
  salesChannel: Readonly<{
    id: string
    metadata: Readonly<Record<string, unknown>> | null
  }>
  translationPlan: CatalogTranslationPlan
}>

export type MarketCatalogProductPlanItem = Readonly<{
  action: "unchanged" | "update"
  desiredAssignment: ProductPublicationAssignment
  previousAssignment: ProductPublicationAssignment | null
  productId: string
  sourceVersion: string
}>

export type MarketCatalogEntityPlanItem = Readonly<{
  action: "create" | "unchanged" | "update"
  desiredAssignment: ProductPublicationAssignment
  entityId: string
  entityKind: "brand" | "category"
  nextSourceVersion: number
  previousAssignment: MarketCatalogAssignmentSnapshot | null
}>

export type MarketCatalogPublicationPlan = Readonly<{
  environment: MarketCatalogPublicationManifest["environment"]
  items: Readonly<{
    brands: readonly MarketCatalogEntityPlanItem[]
    categories: readonly MarketCatalogEntityPlanItem[]
    products: readonly MarketCatalogProductPlanItem[]
  }>
  locale: MarketCatalogPublicationLocale
  manifestSha256: string
  market: MarketCatalogPublicationMarket
  protectedState: CatalogTranslationPlan["protectedState"]
  salesChannelId: string
  schemaVersion: 1
  scope: Readonly<{
    brandIds: readonly string[]
    categoryIds: readonly string[]
    productIds: readonly string[]
  }>
  scopeSha256: string
  summary: Readonly<{
    brandAssignmentsToCreate: number
    brandAssignmentsToUpdate: number
    brands: number
    categoryAssignmentsToCreate: number
    categoryAssignmentsToUpdate: number
    categories: number
    productPublicationsToUpdate: number
    products: number
  }>
  translationInputSha256: string
  translationPlanHash: string
}>

export type MarketCatalogPublicationPlanArtifact = Readonly<{
  plan: MarketCatalogPublicationPlan
  planHash: string
  schemaVersion: 1
}>

export type MarketCatalogPublicationRollbackArtifact = Readonly<{
  createdAt: string
  environment: MarketCatalogPublicationManifest["environment"]
  items: MarketCatalogPublicationPlan["items"]
  market: MarketCatalogPublicationMarket
  planHash: string
  schemaVersion: 1
  scopeSha256: string
}>

export type MarketCatalogPublicationApplyReceipt = Readonly<{
  appliedAt: string
  environment: MarketCatalogPublicationManifest["environment"]
  payloadSha256: string
  planHash: string
  rollbackArtifactSha256: string
  schemaVersion: 1
  scopeSha256: string
  summary: MarketCatalogPublicationPlan["summary"]
  targetStateSha256: string
}>

export type MarketCatalogPublicationCliOptions = Readonly<{
  apply: boolean
  confirmPlanHash?: string
  manifestPath: string
  planOutputPath: string
  receiptOutputPath?: string
  rollbackOutputPath?: string
  translationInputPath: string
}>
