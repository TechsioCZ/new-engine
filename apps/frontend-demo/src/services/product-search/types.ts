import type { HttpTypes } from "@medusajs/types"

export type QueryParamPrimitive = string | number | boolean

export type QueryParamValue =
  | QueryParamPrimitive
  | QueryParamPrimitive[]
  | undefined
  | null

export type ProductFiltersLike = {
  categories?: string[]
  sizes?: string[]
}

export type ProductFetchStrategy =
  | "MEILI_CATEGORY_SIZE_INTERSECTION"
  | "MEILI_CATEGORY_INTERSECTION"
  | "MEILI_SIZE_INTERSECTION"
  | "SIZE_ONLY_FALLBACK"
  | "MEILI_ONLY"
  | "DEFAULT_MEDUSA"

export type MeiliSearchProductHit = {
  id?: string
}

export type MeiliSearchHitsResponse = {
  hits?: MeiliSearchProductHit[]
  estimatedTotalHits?: number
  limit?: number
  offset?: number
}

export type StoreProductVariantLite = {
  id?: string
  product_id?: string
}

export type StoreProductVariantListResponse = {
  variants?: StoreProductVariantLite[]
  count?: number
}

export type StoreProductIdLite = {
  id?: string
}

export type StoreProductIdListResponse = {
  products?: StoreProductIdLite[]
  count?: number
}

export type StoreProductRecord = HttpTypes.StoreProduct & {
  id: string
}

export type RawProductListResponse = {
  products: StoreProductRecord[]
  count: number
  limit: number
  offset: number
}

export type SearchStrategyInput = {
  limit: number
  offset: number
  fields: string
  filters?: ProductFiltersLike
  category?: string | string[]
  sort?: string
  q?: string
  region_id?: string
  country_code: string
  signal?: AbortSignal
}

export type PaginatedIdsPageResult = {
  ids: string[]
  itemCount: number
  totalCount?: number
}
