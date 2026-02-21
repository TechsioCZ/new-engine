"use client";

import { useState } from "react";
import type {
  ProductDetailDataState,
} from "@/components/product-detail/use-product-detail-data";
import type { StorefrontProduct } from "@/components/product-detail/product-detail.types";
import {
  storefrontCartReadQueryOptions,
  useAddLineItem,
  useCart,
} from "@/lib/storefront/cart";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import {
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
} from "@/lib/storefront/products";

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
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const cartQuery = useCart({
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  }, {
    queryOptions: storefrontCartReadQueryOptions,
  });

  const addLineItemMutation = useAddLineItem();
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
    setActiveProductId(productToAdd.id);

    try {
      const variantId = variantIdOverride ?? productToAdd.variants?.[0]?.id;
      if (!variantId || !region?.region_id) {
        throw new Error("Produkt nemá dostupnú variantu na pridanie do košíka.");
      }

      await addLineItemMutation.mutateAsync({
        cartId: cartQuery.cart?.id,
        variantId,
        quantity: quantityToAdd,
        autoCreate: true,
        region_id: region.region_id,
        country_code: region.country_code,
      });
    } catch (error) {
      setAddToCartError(resolveErrorMessage(error));
    } finally {
      setActiveProductId(null);
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
      addLineItemMutation.isPending &&
      Boolean(product?.id) &&
      activeProductId === product?.id,
    isProductAdding: (productId: string) =>
      addLineItemMutation.isPending && activeProductId === productId,
  };
}
