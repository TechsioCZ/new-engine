"use client"

import type { Product } from "@/components/product-detail/product-detail.types"
import { useProductDetailActions } from "@/components/product-detail/use-product-detail-actions"
import { useProductDetailData } from "@/components/product-detail/use-product-detail-data"

type UseProductDetailControllerProps = {
  brandPublicSlugsById?: Readonly<Record<string, string>>
  categoryPublicSlugsById?: Readonly<Record<string, string>>
  handle: string
  initialProduct?: Product
  initialVariantId?: string
  productPublicSlugsById?: Readonly<Record<string, string>>
}

export function useProductDetailController({
  brandPublicSlugsById,
  categoryPublicSlugsById,
  handle,
  initialProduct,
  initialVariantId,
  productPublicSlugsById,
}: UseProductDetailControllerProps) {
  const data = useProductDetailData({
    brandPublicSlugsById,
    categoryPublicSlugsById,
    handle,
    initialProduct,
    initialVariantId,
    productPublicSlugsById,
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
