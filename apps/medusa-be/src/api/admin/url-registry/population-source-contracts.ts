import type {
  CatalogMarket,
  CatalogTranslationProof,
} from "../../../utils/catalog-translation"

export const POPULATION_SOURCE_KINDS = [
  "product",
  "category",
  "brand",
  "collection",
  "article",
  "page",
] as const

export type PopulationSourceKind = (typeof POPULATION_SOURCE_KINDS)[number]

export type PopulationSourceQuery = Readonly<{
  limit: number
  market: CatalogMarket
  offset: number
  sourceKind: PopulationSourceKind
}>

export type CatalogPopulationSourceItem = Readonly<{
  assignmentId?: string
  authorityKind: "medusa-product-publication" | "medusa-published-assignment"
  market: CatalogMarket
  publicSlug: string
  salesChannelId: string
  sourceId: string
  sourceVersion: string
  translation: CatalogTranslationProof
}>

export type CmsPopulationSourceItem = Readonly<{
  authorityKind: "payload-published-document"
  documentStatus: "published"
  legacySlug: string
  locale: string
  sourceId: string
  sourceVersion: string
  stableIdVerified: true
}>

export type PopulationSourcePage = Readonly<{
  complete: boolean
  items: readonly (CatalogPopulationSourceItem | CmsPopulationSourceItem)[]
  locale: string
  market: CatalogMarket
  nextOffset: number | null
  offset: number
  scanned: number
  schemaVersion: 1
  sourceKind: PopulationSourceKind
  total: number
}>

export type PopulationSourceRead =
  | Readonly<{ kind: "found"; page: PopulationSourcePage }>
  | Readonly<{ kind: "invalid"; message: string }>
  | Readonly<{ kind: "unavailable" }>
