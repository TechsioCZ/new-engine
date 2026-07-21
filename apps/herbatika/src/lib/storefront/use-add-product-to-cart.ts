"use client"

import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { cartReadQueryOptions, useAddLineItem, useCart } from "./cart"
import { resolveErrorMessage } from "./error-utils"
import { resolveVariantInventoryState } from "./product-availability"
import {
  asStorefrontNumber,
  asStorefrontRecord,
  resolveProductTopOffer,
} from "./product-pricing"

export type UseAddProductToCartProps = {
  regionId?: string
  countryCode?: string
}

export type AddProductToCartInput = {
  product: Pick<
    HttpTypes.StoreProduct,
    "id" | "metadata" | "title" | "variants"
  >
  quantity?: number
  variantId?: string | null
}

class AddProductToCartError extends Error {
  override readonly name = "AddProductToCartError"
}

type CartTranslator = ReturnType<typeof useTranslations<"cart">>

const INSUFFICIENT_INVENTORY_ERROR_PATTERN =
  /insufficient_inventory|required inventory|does not have the required inventory/i

const isInsufficientInventoryError = (message: string) =>
  INSUFFICIENT_INVENTORY_ERROR_PATTERN.test(message)

export const resolveAddProductToCartErrorMessage = (
  error: unknown,
  fallbackMessage: string
) =>
  error instanceof AddProductToCartError ? error.message : fallbackMessage

const resolveInsufficientQuantityMessage = ({
  availableQuantity,
  cartQuantity,
  translateCart,
}: {
  availableQuantity: number | null
  cartQuantity: number
  translateCart: CartTranslator
}) => {
  if (availableQuantity === null || availableQuantity < 1) {
    return translateCart("insufficient_quantity")
  }

  if (cartQuantity > 0) {
    return translateCart("insufficient_quantity_in_cart", {
      availableQuantity,
      cartQuantity,
    })
  }

  return translateCart("insufficient_quantity_available", {
    availableQuantity,
  })
}

const resolveProductVariantId = (
  product: AddProductToCartInput["product"],
  variantId?: string | null
) => {
  if (variantId) {
    return variantId
  }

  return product.variants?.[0]?.id ?? null
}

const resolveProductVariant = (
  product: AddProductToCartInput["product"],
  variantId?: string | null
) => {
  const resolvedVariantId = resolveProductVariantId(product, variantId)
  if (!resolvedVariantId) {
    return null
  }

  return (
    product.variants?.find((variant) => variant.id === resolvedVariantId) ??
    null
  )
}

const resolveLineItemMetadata = (product: AddProductToCartInput["product"]) => {
  const topOffer = resolveProductTopOffer(product)

  return topOffer ? { top_offer: topOffer } : undefined
}

const resolveLineItemVariantId = (
  item: HttpTypes.StoreCartLineItem
): string | null => {
  const itemRecord = asStorefrontRecord(item)

  if (typeof itemRecord?.variant_id === "string") {
    return itemRecord.variant_id
  }

  const variant = asStorefrontRecord(itemRecord?.variant)
  return typeof variant?.id === "string" ? variant.id : null
}

const resolveExistingCartVariantQuantity = (
  cart: HttpTypes.StoreCart | null,
  variantId: string | null
) => {
  if (!variantId) {
    return 0
  }

  return (cart?.items ?? []).reduce((sum, item) => {
    if (resolveLineItemVariantId(item) !== variantId) {
      return sum
    }

    return sum + Math.max(0, Math.floor(asStorefrontNumber(item.quantity) ?? 0))
  }, 0)
}

const assertAddProductToCartVariant = ({
  cartQuantity,
  translateCart,
  product,
  quantity,
  variantId,
}: {
  cartQuantity: number
  translateCart: CartTranslator
  product: AddProductToCartInput["product"]
  quantity: number
  variantId?: string | null
}) => {
  const resolvedVariant = resolveProductVariant(product, variantId)
  const resolvedVariantId = resolvedVariant?.id ?? null

  if (!(resolvedVariantId && resolvedVariant)) {
    throw new AddProductToCartError(translateCart("missing_variant"))
  }

  if (typeof resolvedVariant.calculated_price?.calculated_amount !== "number") {
    throw new AddProductToCartError(translateCart("unavailable_in_region"))
  }

  const requestedTotalQuantity = cartQuantity + quantity
  const inventoryState = resolveVariantInventoryState(
    resolvedVariant,
    requestedTotalQuantity
  )

  if (!inventoryState.isInStock) {
    throw new AddProductToCartError(translateCart("out_of_stock"))
  }

  if (!inventoryState.isPurchasable) {
    throw new AddProductToCartError(
      resolveInsufficientQuantityMessage({
        availableQuantity: inventoryState.availableQuantity,
        cartQuantity,
        translateCart,
      })
    )
  }

  return resolvedVariantId
}

export function useAddProductToCart({
  regionId,
  countryCode,
}: UseAddProductToCartProps) {
  const translateCart = useTranslations("cart")
  const [activeProductId, setActiveProductId] = useState<string | null>(null)

  const addLineItemMutation = useAddLineItem()
  const cartQuery = useCart(
    {
      autoCreate: false,
      autoUpdateRegion: false,
      country_code: countryCode,
      region_id: regionId,
    },
    {
      queryOptions: cartReadQueryOptions,
    }
  )

  const addProductToCart = async ({
    product,
    quantity = 1,
    variantId,
  }: AddProductToCartInput) => {
    if (!regionId) {
      throw new AddProductToCartError(translateCart("missing_region"))
    }

    const resolvedProductVariantId = resolveProductVariantId(product, variantId)
    const resolvedVariantId = assertAddProductToCartVariant({
      cartQuantity: resolveExistingCartVariantQuantity(
        cartQuery.cart,
        resolvedProductVariantId
      ),
      translateCart,
      product,
      quantity,
      variantId,
    })

    setActiveProductId(product.id)

    try {
      await addLineItemMutation.mutateAsync({
        variantId: resolvedVariantId,
        quantity,
        metadata: resolveLineItemMetadata(product),
        autoCreate: true,
        region_id: regionId,
        country_code: countryCode,
      })
    } catch (error) {
      const errorMessage = resolveErrorMessage(error, translateCart("failed"))
      throw new AddProductToCartError(
        isInsufficientInventoryError(errorMessage)
          ? translateCart("insufficient_quantity")
          : translateCart("failed")
      )
    } finally {
      setActiveProductId(null)
    }
  }

  return {
    addProductToCart,
    activeProductId,
    isAddPending: addLineItemMutation.isPending,
    isProductAdding: (productId: string) =>
      addLineItemMutation.isPending && activeProductId === productId,
  }
}
