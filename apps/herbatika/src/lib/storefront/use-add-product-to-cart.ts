"use client"

import type { HttpTypes } from "@medusajs/types"
import { useState } from "react"
import { cartReadQueryOptions, useAddLineItem, useCart } from "./cart"
import { resolveErrorMessage } from "./error-utils"
import { resolveVariantInventoryState } from "./product-availability"
import {
  asStorefrontNumber,
  asStorefrontRecord,
  resolveProductTopOffer,
} from "./product-pricing"

type AddToCartMessages = {
  insufficientQuantity?: string
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

export const ADD_PRODUCT_TO_CART_SUCCESS_MESSAGE = "Produkt bol pridaný do košíka."

const DEFAULT_MESSAGES = {
  insufficientQuantity: "Nedostatočné množstvo produktu.",
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

export const resolveAddProductToCartErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : DEFAULT_MESSAGES.failed

const resolveInsufficientQuantityMessage = ({
  availableQuantity,
  cartQuantity,
  fallbackMessage,
}: {
  availableQuantity: number | null
  cartQuantity: number
  fallbackMessage: string
}) => {
  if (availableQuantity === null || availableQuantity < 1) {
    return fallbackMessage
  }

  if (cartQuantity > 0) {
    return `${fallbackMessage} V košíku už máte ${cartQuantity} ks, dostupné množstvo je ${availableQuantity} ks.`
  }

  return `${fallbackMessage} Dostupné množstvo: ${availableQuantity} ks.`
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

  return product.variants?.find((variant) => variant.id === resolvedVariantId) ?? null
}

const resolveLineItemMetadata = (product: AddProductToCartInput["product"]) => {
  const topOffer = resolveProductTopOffer(product)

  return topOffer ? { top_offer: topOffer } : undefined
}

const resolveLineItemVariantId = (item: HttpTypes.StoreCartLineItem): string | null => {
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
  messages,
  product,
  quantity,
  variantId,
}: {
  cartQuantity: number
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

  const requestedTotalQuantity = cartQuantity + quantity
  const inventoryState = resolveVariantInventoryState(
    resolvedVariant,
    requestedTotalQuantity
  )

  if (!inventoryState.isInStock) {
    throw new Error(messages.outOfStock)
  }

  if (!inventoryState.isPurchasable) {
    throw new Error(
      resolveInsufficientQuantityMessage({
        availableQuantity: inventoryState.availableQuantity,
        cartQuantity,
        fallbackMessage: messages.insufficientQuantity,
      })
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
      throw new Error(resolvedMessages.missingRegion)
    }

    const resolvedProductVariantId = resolveProductVariantId(product, variantId)
    const resolvedVariantId = assertAddProductToCartVariant({
      cartQuantity: resolveExistingCartVariantQuantity(
        cartQuery.cart,
        resolvedProductVariantId
      ),
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
          ? resolvedMessages.insufficientQuantity
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
