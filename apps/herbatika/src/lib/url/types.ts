export type Market = "sk" | "cz" | "hu" | "ro"

export type UrlKind =
  | "product"
  | "category"
  | "brand"
  | "collection"
  | "campaign"
  | "article"
  | "page"

export type UrlStatus = "current" | "alias" | "tombstone"

export type UrlRecord = {
  id: string
  market: Market
  kind: UrlKind
  slug: string
  entityId: string
  equivalenceKey: string
  indexable: boolean
  status: UrlStatus
  aliasOf: string | null
  updatedAt: Date
}

export const MARKETS: readonly Market[] = ["sk", "cz", "hu", "ro"] as const

export const URL_KINDS: readonly UrlKind[] = [
  "product",
  "category",
  "brand",
  "collection",
  "campaign",
  "article",
  "page",
] as const
