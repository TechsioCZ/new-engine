"use client"

import type { Product } from "@/components/product-detail/product-detail.types"
import type { ProductDetailDataState } from "@/components/product-detail/use-product-detail-data"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import {
  PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
} from "@/lib/storefront/products"
import { useAddProductToCartAction } from "@/lib/storefront/use-add-product-to-cart-action"

interface UseProductDetailActionsProps {
  product: ProductDetailDataState["product"]
  quantity: ProductDetailDataState["quantity"]
  region: ProductDetailDataState["region"]
  selectedVariant: ProductDetailDataState["selectedVariant"]
  selectedVolumeDiscountOption: ProductDetailDataState["selectedVolumeDiscountOption"]
}

export const useProductDetailActions = ({
  product,
  quantity,
  region,
  selectedVariant,
  selectedVolumeDiscountOption,
}: UseProductDetailActionsProps) => {
  const addToCart = useAddProductToCartAction({
    ...(region?.region_id === undefined ? {} : { regionId: region?.region_id }),
    ...(region?.country_code === undefined
      ? {}
      : { countryCode: region?.country_code }),
  })
  const prefetchProduct = usePrefetchProduct({
    defaultDelay: 220,
    skipMode: "any",
  })

  const addProductToCart = async (
    productToAdd: Product,
    quantityToAdd: number,
    variantIdOverride?: string | null,
  ) => {
    await addToCart.addProductToCart({
      product: productToAdd,
      quantity: quantityToAdd,
      ...(variantIdOverride === undefined
        ? {}
        : { variantId: variantIdOverride }),
    })
  }

  return {
    handleAddMainProductToCart: () => {
      if (
        product === null ||
        selectedVariant?.id === undefined ||
        selectedVariant.id === ""
      ) {
        return
      }

      runDetachedPromise(
        addProductToCart(product, quantity, selectedVariant.id),
      )
    },
    handleAddRelatedProductToCart: (productToAdd: Product) => {
      runDetachedPromise(addProductToCart(productToAdd, 1))
    },
    handleAddVolumeDiscountToCart: () => {
      if (
        product === null ||
        selectedVariant?.id === undefined ||
        selectedVariant.id === "" ||
        selectedVolumeDiscountOption === null
      ) {
        return
      }

      runDetachedPromise(
        addProductToCart(
          product,
          selectedVolumeDiscountOption.quantity,
          selectedVariant.id,
        ),
      )
    },
    handleRelatedProductHoverEnd: (
      sectionId: string,
      hoveredProduct: Product,
    ) => {
      prefetchProduct.cancelPrefetch(
        `${sectionId}-product-${hoveredProduct.id}`,
      )
    },
    handleRelatedProductHoverStart: (
      sectionId: string,
      hoveredProduct: Product,
    ) => {
      if (hoveredProduct.handle === undefined || hoveredProduct.handle === "") {
        return
      }

      prefetchProduct.delayedPrefetch(
        {
          fields: PRODUCT_DETAIL_FIELDS,
          handle: hoveredProduct.handle,
        },
        220,
        `${sectionId}-product-${hoveredProduct.id}`,
      )
    },
    isMainProductAdding:
      addToCart.isAddPending &&
      product?.id !== undefined &&
      product.id !== "" &&
      addToCart.activeProductId === product?.id,
    isProductAdding: (productId: string) =>
      addToCart.isProductAdding(productId),
  }
}
