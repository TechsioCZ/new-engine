import type { Product } from "./product"

export interface ProductFilters {
  categories?: string[]
  sizes?: string[]
}

export interface ProductListParams {
  limit?: number
  offset?: number
  fields?: string
  filters?: ProductFilters
  category?: string | string[]
  sort?: string
  q?: string
  region_id?: string
  country_code?: string
}

export interface ProductListResponse {
  products: Product[]
  count: number
  limit: number
  offset: number
}
