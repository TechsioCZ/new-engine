import type { Market, UrlKind, UrlRecord } from "@/lib/url/types"

export type UrlLookupResult =
  | { type: "current"; record: UrlRecord }
  | { type: "alias"; record: UrlRecord; currentRecord: UrlRecord }
  | { type: "tombstone"; record: UrlRecord }
  | { type: "missing" }

export type CreateUrlRecordInput = Pick<
  UrlRecord,
  "market" | "kind" | "slug" | "entityId" | "equivalenceKey" | "indexable"
>

export type UrlRegistryListQuery = {
  id?: string
  market?: Market
  kind?: UrlKind
  entityId?: string
  equivalenceKey?: string
  status?: UrlRecord["status"]
  limit?: number
  offset?: number
}

export type UrlRegistryListResult = {
  records: UrlRecord[]
  limit: number
  offset: number
  hasMore: boolean
}

// biome-ignore lint/style/useConsistentTypeDefinitions: This public port is intentionally an interface.
export interface UrlRegistry {
  lookup(market: Market, kind: UrlKind, slug: string): Promise<UrlLookupResult>
  findByEntity(
    market: Market,
    kind: UrlKind,
    entityId: string
  ): Promise<UrlRecord | null>
  findAlternates(equivalenceKey: string): Promise<UrlRecord[]>
  create(input: CreateUrlRecordInput): Promise<UrlRecord>
  changeSlug(
    market: Market,
    kind: UrlKind,
    entityId: string,
    newSlug: string
  ): Promise<UrlRecord>
  tombstone(market: Market, kind: UrlKind, entityId: string): Promise<UrlRecord>
  list(query?: UrlRegistryListQuery): Promise<UrlRegistryListResult>
}

export const DEFAULT_LIST_LIMIT = 50
export const MAX_LIST_LIMIT = 100

export const normalizeListBounds = (query: UrlRegistryListQuery = {}) => ({
  limit: Math.min(
    Math.max(Math.trunc(query.limit ?? DEFAULT_LIST_LIMIT), 1),
    MAX_LIST_LIMIT
  ),
  offset: Math.max(Math.trunc(query.offset ?? 0), 0),
})
