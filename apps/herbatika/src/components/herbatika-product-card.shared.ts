"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useEffect, useState } from "react"
import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-card/product-card.constants"
import { resolvePriceState } from "@/components/product-card/product-card.pricing"
import { resolveThumbnail } from "@/components/product-card/product-card.thumbnail"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

export type HerbatikaProductCardBaseProps = {
  product: HttpTypes.StoreProduct
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void
}

type HerbatikaProductCardStateOptions = {
  priceUnavailableLabel: string
  onImageError?: () => void
}

export function useHerbatikaProductCardState(
  product: HttpTypes.StoreProduct,
  {
    priceUnavailableLabel,
    onImageError,
  }: HerbatikaProductCardStateOptions
) {
  const region = useRegionContext()
  const currencyCode = resolveRegionCurrency(region)
  const productHref = product.handle ? `/p/${product.handle}` : "/#"
  const price = resolvePriceState(
    product,
    currencyCode,
    priceUnavailableLabel
  )
  const thumbnail = resolveThumbnail(product)
  const [imageSrc, setImageSrc] = useState(thumbnail)
  const title = product.title?.trim() || product.handle?.trim() || product.id

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
