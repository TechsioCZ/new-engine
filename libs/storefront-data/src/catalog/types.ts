import type { QueryKey } from "../shared/query-keys"
import type { RegionInfo } from "../shared/region"
import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-types"
export type { RegionInfo } from "../shared/region"

export type CatalogListInputBase = RegionInfo & {
  q?: string
  page?: number
  limit?: number
  sort?: string
  category_id?: string[]
  status?: string[]
  form?: string[]
  brand?: string[]
  ingredient?: string[]
  price_min?: number
  price_max?: number
  currency_code?: string
  enabled?: boolean
}

export type CatalogFacetItem = {
  id: string
  label: string
  count: number
}

export type CatalogPriceFacet = {
  min: number | null
  max: number | null
}

export type CatalogFacets = {
  status: CatalogFacetItem[]
  form: CatalogFacetItem[]
  brand: CatalogFacetItem[]
  ingredient: CatalogFacetItem[]
  price: CatalogPriceFacet
}

export type CatalogListResponse<TProduct, TFacets = CatalogFacets> = {
  products: TProduct[]
  count: number
  page: number
  limit: number
  totalPages: number
  facets: TFacets
}

export type CatalogService<TProduct, TListParams, TFacets = CatalogFacets> = {
  getCatalogProducts: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<CatalogListResponse<TProduct, TFacets>>
}

export type CatalogQueryKeys<TListParams> = {
  all: () => QueryKey
  list: (params: TListParams) => QueryKey
}

export type UseCatalogProductsResult<TProduct, TFacets = CatalogFacets> =
  ReadResultBase<QueryResult<CatalogListResponse<TProduct, TFacets>>> & {
    products: TProduct[]
    facets: TFacets
    totalCount: number
    currentPage: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }

export type UseSuspenseCatalogProductsResult<TProduct, TFacets = CatalogFacets> =
  SuspenseResultBase<SuspenseQueryResult<CatalogListResponse<TProduct, TFacets>>> & {
    products: TProduct[]
    facets: TFacets
    totalCount: number
    currentPage: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
