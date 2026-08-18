"use client"

import type { Product } from "@/components/product-detail/product-detail.types"
import { useProductDetailActions } from "@/components/product-detail/use-product-detail-actions"
import { useProductDetailData } from "@/components/product-detail/use-product-detail-data"

type UseProductDetailControllerProps = {
  handle: string
  initialProduct?: Product
  initialVariantId?: string
}

export function useProductDetailController({
  handle,
  initialProduct,
  initialVariantId,
}: UseProductDetailControllerProps) {
  const data = useProductDetailData({
    handle,
    initialProduct,
    initialVariantId,
  })
  const actions = useProductDetailActions({
    product: data.product,
    quantity: data.quantity,
    region: data.region,
    selectedVariant: data.selectedVariant,
    selectedVolumeDiscountOption: data.selectedVolumeDiscountOption,
  })

  return {
    ...actions,
    ...data,
    handleQuantityChange: data.setQuantity,
    handleSelectVariant: data.setSelectedVariantId,
    handleSelectVolumeDiscount: data.setSelectedVolumeDiscountId,
  }
}

export type ProductDetailController = ReturnType<
  typeof useProductDetailController
>
