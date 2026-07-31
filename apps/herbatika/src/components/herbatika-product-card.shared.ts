"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useEffect, useState } from "react"
import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-card/product-card.constants"
import { resolvePriceState } from "@/components/product-card/product-card.pricing"
import { resolveThumbnail } from "@/components/product-card/product-card.thumbnail"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import {
  asStorefrontRecord,
  asStorefrontString,
} from "@/lib/storefront/product-pricing"

export type HerbatikaProductCardBaseProps = {
  product: HttpTypes.StoreProduct
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void
}

export function useHerbatikaProductCardState(
  product: HttpTypes.StoreProduct,
  onImageError?: () => void
) {
  const region = useRegionContext()
  const currencyCode = resolveRegionCurrency(region)
  const productRecord = asStorefrontRecord(product)
  const searchResult = asStorefrontRecord(productRecord?.search_result)
  const searchResultVariantId = asStorefrontString(searchResult?.variant_id)
  const searchResultVariantTitle = asStorefrontString(
    searchResult?.variant_title
  )
  const productHref = product.handle
    ? `/p/${product.handle}${searchResultVariantId ? `?variant=${encodeURIComponent(searchResultVariantId)}` : ""}`
    : "/#"
  const price = resolvePriceState(product, currencyCode)
  const thumbnail = resolveThumbnail(product)
  const [imageSrc, setImageSrc] = useState(thumbnail)
  const productTitle = product.title || "Produkt"
  const title = searchResultVariantTitle
    ? `${productTitle} – ${searchResultVariantTitle}`
    : productTitle

  useEffect(() => {
    setImageSrc(thumbnail)
  }, [thumbnail])

  const handleImageError = () => {
    onImageError?.()

    setImageSrc((currentImageSrc) =>
      currentImageSrc === PRODUCT_FALLBACK_IMAGE
        ? currentImageSrc
        : PRODUCT_FALLBACK_IMAGE
    )
  }

  return {
    handleImageError,
    imageSrc,
    price,
    productHref,
    title,
  }
}
