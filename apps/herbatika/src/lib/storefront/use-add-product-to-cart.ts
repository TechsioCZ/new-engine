"use client"

import { useState } from "react"

import {
  assertAddProductToCartVariant,
  type AddProductToCartInput,
  resolveExistingCartVariantQuantity,
  resolveLineItemMetadata,
  resolveProductVariantId,
} from "./add-product-to-cart-validation"
import { cartReadQueryOptions, useAddLineItem, useCart } from "./cart"
import { resolveErrorMessage } from "./error-utils"

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
export const ADD_PRODUCT_TO_CART_SUCCESS_MESSAGE =
  "Produkt bol pridaný do košíka."
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
      ...(countryCode === undefined ? {} : { country_code: countryCode }),
      ...(regionId === undefined ? {} : { region_id: regionId }),
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
      ...(variantId === undefined ? {} : { variantId }),
    })

    setActiveProductId(product.id)

    try {
      const metadata = resolveLineItemMetadata(product)
      await addLineItemMutation.mutateAsync({
        variantId: resolvedVariantId,
        quantity,
        ...(metadata === undefined ? {} : { metadata }),
        autoCreate: true,
        region_id: regionId,
        ...(countryCode === undefined ? {} : { country_code: countryCode }),
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
