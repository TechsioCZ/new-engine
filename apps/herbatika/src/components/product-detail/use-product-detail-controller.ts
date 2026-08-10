"use client"

import { useProductDetailActions } from "@/components/product-detail/use-product-detail-actions"
import { useProductDetailData } from "@/components/product-detail/use-product-detail-data"

interface UseProductDetailControllerProps {
  handle: string
  initialVariantId?: string
}

export const useProductDetailController = ({
  handle,
  initialVariantId,
}: UseProductDetailControllerProps) => {
  const data = useProductDetailData({
    handle,
    ...(initialVariantId === undefined ? {} : { initialVariantId }),
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
