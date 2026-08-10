"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

import type { AddProductToCartInput } from "./add-product-to-cart-types"
import {
  AddProductToCartError,
  assertAddProductToCartVariant,
  resolveExistingCartVariantQuantity,
  resolveLineItemMetadata,
  resolveProductVariantId,
} from "./add-product-to-cart-validation"
import { cartReadQueryOptions, useAddLineItem, useCart } from "./cart"
import { resolveErrorMessage } from "./error-utils"

export interface UseAddProductToCartProps {
  regionId?: string
  countryCode?: string
}

export type { AddProductToCartInput } from "./add-product-to-cart-types"

const INSUFFICIENT_INVENTORY_ERROR_PATTERN =
  /insufficient_inventory|required inventory|does not have the required inventory/iu

export const resolveAddProductToCartErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => (error instanceof AddProductToCartError ? error.message : fallbackMessage)

export const useAddProductToCart = ({
  regionId,
  countryCode,
}: UseAddProductToCartProps) => {
  const translateCart = useTranslations("cart")
  const [activeProductId, setActiveProductId] = useState<string | null>(null)
  const addLineItemMutation = useAddLineItem()
  const cartQuery = useCart(
    {
      autoCreate: false,
      autoUpdateRegion: false,
      ...(typeof countryCode === "string" ? { country_code: countryCode } : {}),
      ...(regionId === undefined ? {} : { region_id: regionId }),
    },
    { queryOptions: cartReadQueryOptions },
  )

  const addProductToCart = async ({
    product,
    quantity = 1,
    variantId,
  }: AddProductToCartInput) => {
    if (typeof regionId !== "string" || regionId.length === 0) {
      throw new AddProductToCartError(translateCart("missing_region"))
    }
    const productVariantId = resolveProductVariantId(product, variantId)
    const resolvedVariantId = assertAddProductToCartVariant({
      cartQuantity: resolveExistingCartVariantQuantity(
        cartQuery.cart,
        productVariantId,
      ),
      product,
      quantity,
      translateCart,
      ...(variantId === undefined ? {} : { variantId }),
    })
    setActiveProductId(product.id)

    try {
      const metadata = resolveLineItemMetadata(product)
      await addLineItemMutation.mutateAsync({
        autoCreate: true,
        ...(typeof countryCode === "string"
          ? { country_code: countryCode }
          : {}),
        ...(metadata === undefined ? {} : { metadata }),
        quantity,
        region_id: regionId,
        variantId: resolvedVariantId,
      })
    } catch (error) {
      const message = resolveErrorMessage(error, translateCart("failed"))
      throw new AddProductToCartError(
        INSUFFICIENT_INVENTORY_ERROR_PATTERN.test(message)
          ? translateCart("insufficient_quantity")
          : translateCart("failed"),
      )
    } finally {
      setActiveProductId(null)
    }
  }

  return {
    activeProductId,
    addProductToCart,
    isAddPending: addLineItemMutation.isPending,
    isProductAdding: (productId: string) =>
      addLineItemMutation.isPending && activeProductId === productId,
  }
}
