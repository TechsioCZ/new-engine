import type { HttpTypes } from "@medusajs/types"
import { getRecordValue } from "@techsio/std/object"
import type { useTranslations } from "next-intl"

import type { AddProductToCartInput } from "./add-product-to-cart-types"
import { resolveVariantInventoryState } from "./product-availability"
import {
  asStorefrontNumber,
  asStorefrontRecord,
  resolveProductTopOffer,
} from "./product-pricing"

type CartTranslator = ReturnType<typeof useTranslations<"cart">>

export class AddProductToCartError extends Error {
  override readonly name = "AddProductToCartError"
}

export const resolveProductVariantId = (
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

export const resolveLineItemMetadata = (
  product: AddProductToCartInput["product"],
) => {
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

export const resolveExistingCartVariantQuantity = (
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
  return translateCart("insufficient_quantity_available", { availableQuantity })
}

export const assertAddProductToCartVariant = ({
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

  const inventoryState = resolveVariantInventoryState(
    resolvedVariant,
    cartQuantity + quantity,
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
