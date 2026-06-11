"use client"

import type { HttpTypes } from "@medusajs/types"
import { useState } from "react"
import { useAddLineItem } from "./cart"
import { resolveErrorMessage } from "./error-utils"
import { resolveVariantInventoryState } from "./product-availability"
import { resolveProductTopOffer } from "./product-pricing"

type AddToCartMessages = {
  missingRegion?: string
  missingVariant?: string
  outOfStock?: string
  unavailableInRegion?: string
  failed?: string
}

type UseAddProductToCartProps = {
  regionId?: string
  countryCode?: string
  messages?: AddToCartMessages
}

type AddProductToCartInput = {
  product: Pick<
    HttpTypes.StoreProduct,
    "id" | "metadata" | "title" | "variants"
  >
  quantity?: number
  variantId?: string | null
}

const DEFAULT_MESSAGES = {
  missingRegion: "Región sa ešte načítava. Skúste to prosím o chvíľu.",
  missingVariant: "Produkt nemá dostupnú variantu na pridanie do košíka.",
  outOfStock: "Produkt momentálne nie je skladom.",
  unavailableInRegion: "Produkt nie je momentálne dostupný pre vybraný región.",
  failed: "Pridanie do košíka zlyhalo.",
} satisfies Required<AddToCartMessages>

const INSUFFICIENT_INVENTORY_ERROR_PATTERN =
  /insufficient_inventory|required inventory|does not have the required inventory/i

const isInsufficientInventoryError = (message: string) =>
  INSUFFICIENT_INVENTORY_ERROR_PATTERN.test(message)

const resolveInsufficientQuantityMessage = (
  availableQuantity: number | null,
  fallbackMessage: string
) => {
  if (availableQuantity === null || availableQuantity < 1) {
    return fallbackMessage
  }

  return `Na sklade je dostupné množstvo ${availableQuantity} ks.`
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

const assertAddProductToCartVariant = ({
  messages,
  product,
  quantity,
  variantId,
}: {
  messages: Required<AddToCartMessages>
  product: AddProductToCartInput["product"]
  quantity: number
  variantId?: string | null
}) => {
  const resolvedVariant = resolveProductVariant(product, variantId)
  const resolvedVariantId = resolvedVariant?.id ?? null

  if (!(resolvedVariantId && resolvedVariant)) {
    throw new Error(messages.missingVariant)
  }

  if (typeof resolvedVariant.calculated_price?.calculated_amount !== "number") {
    throw new Error(messages.unavailableInRegion)
  }

  const inventoryState = resolveVariantInventoryState(resolvedVariant, quantity)

  if (!inventoryState.isInStock) {
    throw new Error(messages.outOfStock)
  }

  if (!inventoryState.isPurchasable) {
    throw new Error(
      resolveInsufficientQuantityMessage(
        inventoryState.availableQuantity,
        messages.outOfStock
      )
    )
  }

  return resolvedVariantId
}

export function useAddProductToCart({
  regionId,
  countryCode,
  messages,
}: UseAddProductToCartProps) {
  const resolvedMessages = {
    ...DEFAULT_MESSAGES,
    ...messages,
  }
  const [activeProductId, setActiveProductId] = useState<string | null>(null)

  const addLineItemMutation = useAddLineItem()

  const addProductToCart = async ({
    product,
    quantity = 1,
    variantId,
  }: AddProductToCartInput) => {
    if (!regionId) {
      throw new Error(resolvedMessages.missingRegion)
    }

    const resolvedVariantId = assertAddProductToCartVariant({
      messages: resolvedMessages,
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
      const errorMessage = resolveErrorMessage(error, resolvedMessages.failed)
      throw new Error(
        isInsufficientInventoryError(errorMessage)
          ? resolvedMessages.outOfStock
          : errorMessage
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
