import type { Market } from "@/lib/url/types"
import type { EntityUrlKind, UrlIndexPolicy } from "../model"

export const POPULATION_MARKETS = ["sk", "cz", "hu", "ro"] as const
export const POPULATION_CATALOG_KINDS = [
  "product",
  "category",
  "brand",
  "collection",
] as const
export const POPULATION_CONTENT_KINDS = ["article", "page"] as const
export const POPULATION_ENTITY_KINDS = [
  ...POPULATION_CATALOG_KINDS,
  ...POPULATION_CONTENT_KINDS,
] as const
export const POPULATION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const POPULATION_SHA256 = /^sha256:[0-9a-f]{64}$/
export const POPULATION_VISIBLE_TEXT = /^[\x21-\x7e]{1,255}$/

export const POPULATION_LOCALE_BY_MARKET = {
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
  sk: "sk-SK",
} as const satisfies Record<Market, string>

export type PopulationBinding = Readonly<{
  locale: string
  market: Market
  salesChannelId: string
}>

export type TaxonomyApproval = Readonly<{
  hash: `sha256:${string}`
  markets: Readonly<
    Record<
      Market,
      Readonly<{ editorialApproval: string; legalApproval: string }>
    >
  >
}>

type EntityBase<Kind extends EntityUrlKind> = Readonly<{
  equivalenceKey: string
  indexPolicy: UrlIndexPolicy
  kind: Kind
  market: Market
  publicSlug: string
  sourceEventId: string
  sourceId: string
  sourceVersion: string
}>

export type AssignedCatalogPopulationEntity = EntityBase<
  Exclude<(typeof POPULATION_CATALOG_KINDS)[number], "product">
> &
  Readonly<{
    authority: Readonly<{
      assignmentId: string
      kind: "medusa-published-assignment"
      locale: string
      publicationStatus: "published"
      salesChannelId: string
      sourceEntityExists: true
      translationVerified: true
    }>
  }>

export type ProductPopulationEntity = EntityBase<"product"> &
  Readonly<{
    authority: Readonly<{
      kind: "medusa-product-publication"
      locale: string
      metadataSchemaVersion: 1
      publicationStatus: "published"
      salesChannelId: string
      sourceEntityExists: true
      translationVerified: true
    }>
  }>

export type CatalogPopulationEntity =
  | AssignedCatalogPopulationEntity
  | ProductPopulationEntity

export type ContentPopulationEntity = EntityBase<
  (typeof POPULATION_CONTENT_KINDS)[number]
> &
  Readonly<{
    authority: Readonly<{
      documentStatus: "published"
      kind: "payload-published-document"
      locale: string
      slugMappingId: string
      stableIdVerified: true
    }>
  }>

export type PopulationEntity = CatalogPopulationEntity | ContentPopulationEntity

export type PopulationManifest = Readonly<{
  bindings: readonly PopulationBinding[]
  completeInventory: true
  entities: readonly PopulationEntity[]
  generatedAt: string
  generator: string
  schemaVersion: 1
  sourceSnapshotHash: `sha256:${string}`
  taxonomyApproval: TaxonomyApproval
}>

export class PopulationManifestError extends Error {
  override readonly name = "PopulationManifestError"
}
