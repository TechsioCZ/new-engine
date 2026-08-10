/**
 * Server-side filtering utilities for Medusa v2 API
 * These functions build query parameters for server-side filtering
 */

import type { HttpTypes } from "@medusajs/types"

import type { ProductFilters } from "@/services/product-service"

export interface MedusaProductQuery {
  limit?: number
  offset?: number
  fields?: string
  category_id?: string | string[]
  country_code?: string
  order?: string
  q?: string
  region_id?: string
  cart_id?: string
  currency_code?: string
  variants?: NonNullable<HttpTypes.StoreProductListParams["variants"]>
}

/**
 * Build Medusa query parameters from our filter interface
 */
export const buildMedusaQuery = (
  filters: ProductFilters | undefined,
  baseQuery: Partial<MedusaProductQuery> = {},
): MedusaProductQuery => {
  const query: MedusaProductQuery = { ...baseQuery }

  if (!filters) {
    return query
  }

  // Category filtering - Medusa supports this natively
  const categories = filters.categories ?? []
  if (categories.length > 0) {
    query.category_id =
      categories.length === 1 ? categories.join("") : categories
  }

  // Size filtering via variant options - Medusa v2 supports this!
  const sizes = filters.sizes ?? []
  if (sizes.length === 1) {
    query.variants = {
      options: {
        value: sizes.join(""),
      },
    }
  } else if (sizes.length > 1) {
    query.variants = {
      $or: sizes.map((value) => ({ options: { value } })),
    }
  }

  // Color filtering - if needed in the future
  // Note: Your products don't seem to use color options currently

  // Price range filtering
  // Note: Medusa v2 doesn't support direct price range filtering in product queries
  // This would need to be implemented via a custom endpoint or post-processing

  return query
}
