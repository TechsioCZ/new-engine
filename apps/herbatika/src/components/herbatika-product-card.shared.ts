"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useState } from "react"

import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-card/product-card.constants"
import { resolvePriceState } from "@/components/product-card/product-card.pricing"
import { resolveThumbnail } from "@/components/product-card/product-card.thumbnail"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

export interface HerbatikaProductCardBaseProps {
  product: HttpTypes.StoreProduct
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void
}

interface HerbatikaProductCardStateOptions {
  priceUnavailableLabel: string
  onImageError?: () => void
}

export const useHerbatikaProductCardState = (
  product: HttpTypes.StoreProduct,
  { priceUnavailableLabel, onImageError }: HerbatikaProductCardStateOptions,
) => {
  const region = useRegionContext()
  const currencyCode = resolveRegionCurrency(region)
  const productHref = product.handle ? `/p/${product.handle}` : "/#"
  const price = resolvePriceState(product, currencyCode, priceUnavailableLabel)
  const thumbnail = resolveThumbnail(product)
  const [imageState, setImageState] = useState(() => ({
    source: thumbnail,
    value: thumbnail,
  }))
  const imageSrc =
    imageState.source === thumbnail ? imageState.value : thumbnail
  const title = product.title?.trim() || product.handle?.trim() || product.id

  const handleImageError = () => {
    onImageError?.()

    setImageState((currentState) => ({
      source: thumbnail,
      value:
        currentState.source === thumbnail &&
        currentState.value === PRODUCT_FALLBACK_IMAGE
          ? currentState.value
          : PRODUCT_FALLBACK_IMAGE,
    }))
  }

  return {
    handleImageError,
    imageSrc,
    price,
    productHref,
    title,
  }
}
