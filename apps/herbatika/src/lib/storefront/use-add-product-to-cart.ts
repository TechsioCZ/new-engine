"use client"

import type { HttpTypes } from "@medusajs/types"
import { getRecordValue } from "@techsio/std/object"
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

export interface UseAddProductToCartProps {
  regionId?: string
  countryCode?: string
}

export interface AddProductToCartInput {
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
  /insufficient_inventory|required inventory|does not have the required inventory/iu

const isInsufficientInventoryError = (message: string) =>
  INSUFFICIENT_INVENTORY_ERROR_PATTERN.test(message)

export const resolveAddProductToCartErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => (error instanceof AddProductToCartError ? error.message : fallbackMessage)

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
  variantId?: string | null,
) => {
  if (typeof variantId === "string" && variantId.length > 0) {
    return variantId
  }

  return product.variants?.[0]?.id ?? null
}

const resolveProductVariant = (
  product: AddProductToCartInput["product"],
  variantId?: string | null,
) => {
  const resolvedVariantId = resolveProductVariantId(product, variantId)
  if (resolvedVariantId === null) {
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
  item: HttpTypes.StoreCartLineItem,
): string | null => {
  const itemRecord = asStorefrontRecord(item)

  const variantId =
    itemRecord === null ? undefined : getRecordValue(itemRecord, "variant_id")
  if (typeof variantId === "string") {
    return variantId
  }

  const variantValue =
    itemRecord === null ? undefined : getRecordValue(itemRecord, "variant")
  const variant = asStorefrontRecord(variantValue)
  const id = variant === null ? undefined : getRecordValue(variant, "id")
  return typeof id === "string" ? id : null
}

const resolveExistingCartVariantQuantity = (
  cart: HttpTypes.StoreCart | null,
  variantId: string | null,
) => {
  if (variantId === null) {
    return 0
  }

  let quantity = 0
  for (const item of cart?.items ?? []) {
    if (resolveLineItemVariantId(item) === variantId) {
      quantity += Math.max(
        0,
        Math.floor(asStorefrontNumber(item.quantity) ?? 0),
      )
    }
  }
  return quantity
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

  if (resolvedVariant === null || resolvedVariantId === null) {
    throw new AddProductToCartError(translateCart("missing_variant"))
  }

  if (typeof resolvedVariant.calculated_price?.calculated_amount !== "number") {
    throw new AddProductToCartError(translateCart("unavailable_in_region"))
  }

  const requestedTotalQuantity = cartQuantity + quantity
  const inventoryState = resolveVariantInventoryState(
    resolvedVariant,
    requestedTotalQuantity,
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
      }),
    )
  }

  return resolvedVariantId
}

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
    {
      queryOptions: cartReadQueryOptions,
    },
  )

  const addProductToCart = async ({
    product,
    quantity = 1,
    variantId,
  }: AddProductToCartInput) => {
    if (typeof regionId !== "string" || regionId.length === 0) {
      throw new AddProductToCartError(translateCart("missing_region"))
    }

    const resolvedProductVariantId = resolveProductVariantId(product, variantId)
    const resolvedVariantId = assertAddProductToCartVariant({
      cartQuantity: resolveExistingCartVariantQuantity(
        cartQuery.cart,
        resolvedProductVariantId,
      ),
      product,
      quantity,
      translateCart,
      ...(variantId === undefined ? {} : { variantId }),
    })

    setActiveProductId(product.id)

    try {
      const lineItemMetadata = resolveLineItemMetadata(product)

      await addLineItemMutation.mutateAsync({
        autoCreate: true,
        ...(typeof countryCode === "string"
          ? { country_code: countryCode }
          : {}),
        ...(lineItemMetadata === undefined
          ? {}
          : { metadata: lineItemMetadata }),
        quantity,
        region_id: regionId,
        variantId: resolvedVariantId,
      })
    } catch (error) {
      const errorMessage = resolveErrorMessage(error, translateCart("failed"))
      throw new AddProductToCartError(
        isInsufficientInventoryError(errorMessage)
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
