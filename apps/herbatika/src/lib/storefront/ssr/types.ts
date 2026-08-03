import type { FindParams, HttpTypes } from "@medusajs/types"
import type { MedusaProductReviewListInput } from "@techsio/storefront-data/reviews/medusa-service"

import type { buildCatalogProductsParams } from "../catalog-query-state"

export type RegionListParams = HttpTypes.StoreRegionFilters & {
  fields?: string
  limit?: number
  offset?: number
}

export type CategoryListParams = FindParams &
  HttpTypes.StoreProductCategoryListParams
export type ProductListParams = HttpTypes.StoreProductListParams
export type CatalogListParams = ReturnType<typeof buildCatalogProductsParams>
export type ProductReviewListParams = MedusaProductReviewListInput

export type ProductDetailParams = {
  handle: string
  region_id?: string
  country_code?: string
  province?: string
  cart_id?: string
  locale?: string
  fields?: string
}
