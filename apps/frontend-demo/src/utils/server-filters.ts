/**
 * Server-side filtering utilities for Medusa v2 API
 * These functions build query parameters for server-side filtering
 */

import type { ProductFilters } from "@/types/product-query"

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
  [key: string]: any
}

/**
 * Build Medusa query parameters from our filter interface
 */
export function buildMedusaQuery(
  filters: ProductFilters | undefined,
  baseQuery: Partial<MedusaProductQuery> = {}
): MedusaProductQuery {
  const query: MedusaProductQuery = { ...baseQuery }

  if (!filters) return query

  // Category filtering - Medusa supports this natively
  if (filters.categories?.length) {
    query.category_id =
      filters.categories.length === 1
        ? filters.categories[0]
        : filters.categories
  }

  // Size filtering via variant options - Medusa v2 supports this!
  if (filters.sizes?.length) {
    // For single size
    if (filters.sizes.length === 1) {
      query.variants = {
        options: {
          value: filters.sizes[0],
        },
      }
    } else {
      // For multiple sizes, we need to use $in operator
      query.variants = {
        options: {
          value: {
            $in: filters.sizes,
          },
        },
      }
    }
  }

  // Color filtering - if needed in the future
  // Note: Your products don't seem to use color options currently

  // Price range filtering
  // Note: Medusa v2 doesn't support direct price range filtering in product queries
  // This would need to be implemented via a custom endpoint or post-processing

  return query
}
