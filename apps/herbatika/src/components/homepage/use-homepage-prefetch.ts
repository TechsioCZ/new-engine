import type { MedusaCatalogProduct } from "@techsio/storefront-data/catalog/medusa-service"

import {
  PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
} from "@/lib/storefront/products"

type RegionLike = {
  region_id?: string
  country_code?: string
} | null

interface UseHomepagePrefetchResult {
  handleProductHoverStart: (product: MedusaCatalogProduct) => void
  handleProductHoverEnd: (product: MedusaCatalogProduct) => void
}

export const useHomepagePrefetch = (
  region: RegionLike,
): UseHomepagePrefetchResult => {
  const { delayedPrefetch, cancelPrefetch } = usePrefetchProduct({
    cacheStrategy: "semiStatic",
    defaultDelay: 160,
  })

  const handleProductHoverStart = (product: MedusaCatalogProduct) => {
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

  const handleProductHoverEnd = (product: MedusaCatalogProduct) => {
    cancelPrefetch(`home-product-${product.id}`)
  }

  return {
    handleProductHoverEnd,
    handleProductHoverStart,
  }
}
