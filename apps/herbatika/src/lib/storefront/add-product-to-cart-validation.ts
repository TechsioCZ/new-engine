import type { HttpTypes } from "@medusajs/types"

import { resolveVariantInventoryState } from "./product-availability"
import {
  asStorefrontNumber,
  asStorefrontRecord,
  resolveProductTopOffer,
} from "./product-pricing"

export type AddProductToCartInput = {
  product: Pick<
    HttpTypes.StoreProduct,
    "id" | "metadata" | "title" | "variants"
  >
  quantity?: number
  variantId?: string | null
}

export const resolveLineItemMetadata = (
  product: AddProductToCartInput["product"]
) => {
  const topOffer = resolveProductTopOffer(product)
  return topOffer ? { top_offer: topOffer } : undefined
}

export const resolveProductVariantId = (
  product: AddProductToCartInput["product"],
  variantId?: string | null
) => variantId || product.variants?.[0]?.id || null

const resolveVariant = (
  product: AddProductToCartInput["product"],
  variantId?: string | null
) => {
  const id = resolveProductVariantId(product, variantId)
  return id
    ? (product.variants?.find((variant) => variant.id === id) ?? null)
    : null
}

const resolveLineItemVariantId = (
  item: HttpTypes.StoreCartLineItem
): string | null => {
  const itemRecord = asStorefrontRecord(item)
  if (typeof itemRecord?.["variant_id"] === "string") {
    return itemRecord["variant_id"]
  }
  const variant = asStorefrontRecord(itemRecord?.["variant"])
  return typeof variant?.["id"] === "string" ? variant["id"] : null
}

export const resolveExistingCartVariantQuantity = (
  cart: HttpTypes.StoreCart | null,
  variantId: string | null
) =>
  variantId
    ? (cart?.items ?? []).reduce(
        (sum, item) =>
          resolveLineItemVariantId(item) === variantId
            ? sum +
              Math.max(0, Math.floor(asStorefrontNumber(item.quantity) ?? 0))
            : sum,
        0
      )
    : 0

export const assertAddProductToCartVariant = ({
  cartQuantity,
  messages,
  product,
  quantity,
  variantId,
}: {
  cartQuantity: number
  messages: {
    insufficientQuantity: string
    missingVariant: string
    outOfStock: string
    unavailableInRegion: string
  }
  product: AddProductToCartInput["product"]
  quantity: number
  variantId?: string | null
}) => {
  const variant = resolveVariant(product, variantId)
  if (!variant?.id) {
    throw new Error(messages.missingVariant)
  }
  if (typeof variant.calculated_price?.calculated_amount !== "number") {
    throw new Error(messages.unavailableInRegion)
  }

  const inventory = resolveVariantInventoryState(
    variant,
    cartQuantity + quantity
  )
  if (!inventory.isInStock) {
    throw new Error(messages.outOfStock)
  }
  if (!inventory.isPurchasable) {
    let message = messages.insufficientQuantity
    if (
      inventory.availableQuantity !== null &&
      inventory.availableQuantity > 0
    ) {
      message =
        cartQuantity > 0
          ? `${message} V košíku už máte ${cartQuantity} ks, dostupné množstvo je ${inventory.availableQuantity} ks.`
          : `${message} Dostupné množstvo: ${inventory.availableQuantity} ks.`
    }
    throw new Error(message)
  }
  return variant.id
}
