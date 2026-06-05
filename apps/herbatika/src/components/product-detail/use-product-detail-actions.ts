"use client";

import { useState } from "react";
import type {
  ProductDetailDataState,
} from "@/components/product-detail/use-product-detail-data";
import type { StorefrontProduct } from "@/components/product-detail/product-detail.types";
import {
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
} from "@/lib/storefront/products";
import { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart";

type UseProductDetailActionsProps = {
  product: ProductDetailDataState["product"];
  quantity: ProductDetailDataState["quantity"];
  region: ProductDetailDataState["region"];
  selectedVariant: ProductDetailDataState["selectedVariant"];
  selectedVolumeDiscountOption: ProductDetailDataState["selectedVolumeDiscountOption"];
};

export function useProductDetailActions({
  product,
  quantity,
  region,
  selectedVariant,
  selectedVolumeDiscountOption,
}: UseProductDetailActionsProps) {
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const addToCart = useAddProductToCart({
    regionId: region?.region_id,
    countryCode: region?.country_code,
  });
  const prefetchProduct = usePrefetchProduct({
    defaultDelay: 220,
    skipMode: "any",
  });

  const addProductToCart = async (
    productToAdd: StorefrontProduct,
    quantityToAdd: number,
    variantIdOverride?: string | null,
  ) => {
    setAddToCartError(null);

    try {
      await addToCart.addProductToCart({
        product: productToAdd,
        quantity: quantityToAdd,
        variantId: variantIdOverride,
      });
    } catch (error) {
      setAddToCartError(
        error instanceof Error
          ? error.message
          : "Pridanie do košíka zlyhalo.",
      );
    }
  };

  return {
    addToCartError,
    handleAddMainProductToCart: () => {
      if (!product || !selectedVariant?.id) {
        return;
      }

      void addProductToCart(product, quantity, selectedVariant.id);
    },
    handleAddRelatedProductToCart: (productToAdd: StorefrontProduct) => {
      void addProductToCart(productToAdd, 1);
    },
    handleAddVolumeDiscountToCart: () => {
      if (!product || !selectedVariant?.id || !selectedVolumeDiscountOption) {
        return;
      }

      void addProductToCart(
        product,
        selectedVolumeDiscountOption.quantity,
        selectedVariant.id,
      );
    },
    handleRelatedProductHoverEnd: (sectionId: string, hoveredProduct: StorefrontProduct) => {
      prefetchProduct.cancelPrefetch(`${sectionId}-product-${hoveredProduct.id}`);
    },
    handleRelatedProductHoverStart: (
      sectionId: string,
      hoveredProduct: StorefrontProduct,
    ) => {
      if (!hoveredProduct.handle) {
        return;
      }

      prefetchProduct.delayedPrefetch(
        {
          handle: hoveredProduct.handle,
          fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
        },
        220,
        `${sectionId}-product-${hoveredProduct.id}`,
      );
    },
    isMainProductAdding:
      addToCart.isAddPending &&
      Boolean(product?.id) &&
      addToCart.activeProductId === product?.id,
    isProductAdding: (productId: string) =>
      addToCart.isProductAdding(productId),
  };
}
