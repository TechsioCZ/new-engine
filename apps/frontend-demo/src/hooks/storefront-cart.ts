"use client"

import type { HttpTypes } from "@medusajs/types"
import { createCartHooks } from "@techsio/storefront-data/cart/hooks"
import {
  createMedusaCartService,
  type MedusaCompleteCartResult,
} from "@techsio/storefront-data/cart/medusa-service"
import type {
  AddLineItemInputBase,
  CartQueryKeys,
  CartStorage,
  UpdateCartInputBase,
  UpdateLineItemInputBase,
} from "@techsio/storefront-data/cart/types"
import { STORAGE_KEYS } from "@/lib/constants"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"

const cartStorage: CartStorage = {
  getCartId: () => {
    if (typeof window === "undefined") {
      return null
    }
    return localStorage.getItem(STORAGE_KEYS.CART_ID)
  },
  setCartId: (cartId: string) => {
    if (typeof window === "undefined") {
      return
    }
    localStorage.setItem(STORAGE_KEYS.CART_ID, cartId)
  },
  clearCartId: () => {
    if (typeof window === "undefined") {
      return
    }
    localStorage.removeItem(STORAGE_KEYS.CART_ID)
  },
}

const cartQueryKeys: CartQueryKeys = {
  all: () => queryKeys.cartKeys.all(),
  active: ({ cartId }) => queryKeys.cartKeys.active({ cartId }),
  detail: (cartId: string) => queryKeys.cartKeys.detail(cartId),
}

type StorefrontUpdateCartInput = UpdateCartInputBase & {
  promo_codes?: string[]
}

const sanitizeCartPayload = (
  input: Record<string, unknown>
): Record<string, unknown> => {
  const payload = { ...input }
  const salesChannelId = payload.salesChannelId

  delete payload.cartId
  delete payload.autoCreate
  delete payload.autoUpdateRegion
  delete payload.enabled
  delete payload.country_code
  delete payload.salesChannelId

  if (typeof salesChannelId === "string" && salesChannelId.length > 0) {
    payload.sales_channel_id = salesChannelId
  }

  return payload
}

const cartHooks = createCartHooks<
  HttpTypes.StoreCart,
  HttpTypes.StoreCreateCart,
  HttpTypes.StoreCreateCart,
  StorefrontUpdateCartInput,
  HttpTypes.StoreUpdateCart,
  AddLineItemInputBase,
  HttpTypes.StoreAddCartLineItem,
  UpdateLineItemInputBase,
  HttpTypes.StoreUpdateCartLineItem,
  MedusaCompleteCartResult
>({
  service: createMedusaCartService(sdk),
  cartStorage,
  queryKeys: cartQueryKeys,
  requireRegion: true,
  buildCreateParams: (input) =>
    sanitizeCartPayload(
      input as Record<string, unknown>
    ) as HttpTypes.StoreCreateCart,
  buildUpdateParams: (input) =>
    sanitizeCartPayload(
      input as Record<string, unknown>
    ) as HttpTypes.StoreUpdateCart,
  buildAddParams: (input) => {
    const payload = sanitizeCartPayload(input as Record<string, unknown>)
    const variantId = payload.variantId

    delete payload.region_id
    delete payload.variantId

    return {
      ...payload,
      variant_id: variantId,
    } as HttpTypes.StoreAddCartLineItem
  },
})

export const {
  useCart: useStorefrontCart,
  useUpdateCart: useStorefrontUpdateCart,
  useUpdateCartAddress: useStorefrontUpdateCartAddress,
  useAddLineItem: useStorefrontAddLineItem,
  useUpdateLineItem: useStorefrontUpdateLineItem,
  useRemoveLineItem: useStorefrontRemoveLineItem,
  useCompleteCart: useStorefrontCompleteCart,
  usePrefetchCart,
} = cartHooks
