"use client"

import { useProductDetailActions } from "@/components/product-detail/use-product-detail-actions"
import { useProductDetailData } from "@/components/product-detail/use-product-detail-data"

type UseProductDetailControllerProps = {
  productId: string
  slug: string
}

export function useProductDetailController({
  productId,
  slug,
}: UseProductDetailControllerProps) {
  const data = useProductDetailData({ productId, slug })
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
