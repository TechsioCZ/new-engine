"use client";

import { useProductDetailActions } from "@/components/product-detail/use-product-detail-actions";
import { useProductDetailData } from "@/components/product-detail/use-product-detail-data";

type UseProductDetailControllerProps = {
  handle: string;
};

export function useProductDetailController({
  handle,
}: UseProductDetailControllerProps) {
  const data = useProductDetailData({ handle });
  const actions = useProductDetailActions({
    product: data.product,
    quantity: data.quantity,
    region: data.region,
    selectedVariant: data.selectedVariant,
    selectedVolumeDiscountOption: data.selectedVolumeDiscountOption,
  });

  return {
    ...actions,
    ...data,
    handleQuantityChange: data.setQuantity,
    handleSelectVariant: data.setSelectedVariantId,
    handleSelectVolumeDiscount: data.setSelectedVolumeDiscountId,
  };
}

export type ProductDetailController = ReturnType<typeof useProductDetailController>;
