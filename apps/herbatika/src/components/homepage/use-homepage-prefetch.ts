import type { HttpTypes } from "@medusajs/types"

import {
  PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
} from "@/lib/storefront/products"

type RegionLike = {
  region_id?: string
  country_code?: string
} | null

interface UseHomepagePrefetchResult {
  handleProductHoverStart: (product: HttpTypes.StoreProduct) => void
  handleProductHoverEnd: (product: HttpTypes.StoreProduct) => void
}

export const useHomepagePrefetch = (
  region: RegionLike,
): UseHomepagePrefetchResult => {
  const { delayedPrefetch, cancelPrefetch } = usePrefetchProduct({
    cacheStrategy: "semiStatic",
    defaultDelay: 160,
  })

  const handleProductHoverStart = (product: HttpTypes.StoreProduct) => {
    const hasRegion =
      typeof region?.region_id === "string" && region.region_id !== ""
    const hasHandle =
      typeof product.handle === "string" && product.handle !== ""
    if (!hasRegion || !hasHandle) {
      return
    }

    delayedPrefetch(
      {
        fields: PRODUCT_DETAIL_FIELDS,
        handle: product.handle,
      },
      120,
      `home-product-${product.id}`,
    )
  }

  const handleProductHoverEnd = (product: HttpTypes.StoreProduct) => {
    cancelPrefetch(`home-product-${product.id}`)
  }

  return {
    handleProductHoverEnd,
    handleProductHoverStart,
  }
}
