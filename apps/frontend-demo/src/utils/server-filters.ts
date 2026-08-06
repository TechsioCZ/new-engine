/**
 * Server-side filtering utilities for Medusa v2 API
 * These functions build query parameters for server-side filtering
 */

import type { ProductFilters } from "@/services/product-service"

const VARIANTS_QUERY_KEY = "variants"

export interface MedusaProductQuery {
  limit?: number
  offset?: number
  fields?: string
  category_id?: string | string[]
  tags?: string | string[]
  q?: string
  region_id?: string
  cart_id?: string
  currency_code?: string
  // Variant filtering requires special handling
  [key: string]: unknown
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
  if (sizes.length > 0) {
    query[VARIANTS_QUERY_KEY] =
      sizes.length === 1
        ? {
            // For a single size, use an exact option value.
            options: {
              value: sizes.join(""),
            },
          }
        : {
            // For multiple sizes, use the $in operator.
            options: {
              value: {
                $in: sizes,
              },
            },
          }
  }

  // Color filtering - if needed in the future
  // Note: Your products don't seem to use color options currently

  // Price range filtering
  // Note: Medusa v2 doesn't support direct price range filtering in product queries
  // This would need to be implemented via a custom endpoint or post-processing

  return query
}
