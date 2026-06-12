import type { HttpTypes } from "@medusajs/types"
import {
  PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
} from "@/lib/storefront/products"

type RegionLike = {
  region_id?: string
  country_code?: string
} | null

type UseHomepagePrefetchResult = {
  handleProductHoverStart: (product: HttpTypes.StoreProduct) => void
  handleProductHoverEnd: (product: HttpTypes.StoreProduct) => void
}

export function useHomepagePrefetch(
  region: RegionLike
): UseHomepagePrefetchResult {
  const { delayedPrefetch, cancelPrefetch } = usePrefetchProduct({
    cacheStrategy: "semiStatic",
    defaultDelay: 160,
  })

  const handleProductHoverStart = (product: HttpTypes.StoreProduct) => {
    if (!(region?.region_id && product.handle)) {
      return
    }

    delayedPrefetch(
      {
        handle: product.handle,
        fields: PRODUCT_DETAIL_FIELDS,
      },
      120,
      `home-product-${product.id}`
    )
  }

  const handleProductHoverEnd = (product: HttpTypes.StoreProduct) => {
    cancelPrefetch(`home-product-${product.id}`)
  }

  return {
    handleProductHoverStart,
    handleProductHoverEnd,
  }
}
