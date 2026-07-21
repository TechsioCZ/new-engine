export const BRAND_SEARCH_PROJECTION_CHANGED = "brand.search_projection_changed"

export const BRAND_SEARCH_PROJECTION_LOCK_KEY = "brand-search-projection"

export const BRAND_SEARCH_PROJECTION_EVENT_OPTIONS = {
  attempts: 5,
  backoff: {
    delay: 1000,
    type: "exponential",
  },
}

export type BrandSearchProjectionChangedEventData = {
  brand_ids: string[]
  product_ids: string[]
}

export const buildBrandSearchProjectionEventData = ({
  brandIds = [],
  productIds = [],
}: {
  brandIds?: string[]
  productIds?: string[]
}): BrandSearchProjectionChangedEventData => ({
  brand_ids: [...new Set(brandIds)],
  product_ids: [...new Set(productIds)],
})
