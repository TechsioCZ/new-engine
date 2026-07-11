"use client"

import { useRequiredStorefrontText } from "./storefront-text-provider"
import { STOREFRONT_TEXT_KEYS } from "./storefront-texts"

export const formatCartStorefrontText = (
  template: string,
  values: Record<string, number | string>
) =>
  Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template
  )

export function useCartStorefrontTexts() {
  return {
    addToCart: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartAddToCart
    ),
    addedToCart: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartAddedToCart
    ),
    addingToCart: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartAddingToCart
    ),
    failed: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.cartFailed),
    insufficientQuantity: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartInsufficientQuantity
    ),
    insufficientQuantityAvailable: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartInsufficientQuantityAvailable
    ),
    insufficientQuantityInCart: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartInsufficientQuantityInCart
    ),
    missingRegion: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartMissingRegion
    ),
    missingVariant: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartMissingVariant
    ),
    outOfStock: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartOutOfStock
    ),
    unavailableInRegion: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartUnavailableInRegion
    ),
    additionalItems: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartAdditionalItems
    ),
    continueToCheckout: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartContinueToCheckout
    ),
    discount: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.cartDiscount),
    emptyDescription: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartEmptyDescription
    ),
    emptyTitle: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartEmptyTitle
    ),
    lowStock: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.cartLowStock),
    productsSubtotalExclTax: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartProductsSubtotalExclTax
    ),
    quantityAria: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartQuantityAria
    ),
    removeFailed: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartRemoveFailed
    ),
    removeItemAria: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartRemoveItemAria
    ),
    shippingExclTax: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartShippingExclTax
    ),
    tax: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.cartTax),
    title: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.cartTitle),
    titleWithCount: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartTitleWithCount
    ),
    totalInclTax: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartTotalInclTax
    ),
    updateFailed: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.cartUpdateFailed
    ),
  }
}

export type CartStorefrontTexts = ReturnType<typeof useCartStorefrontTexts>
