import type { HttpTypes } from "@medusajs/types"
import { createCartHooks } from "@techsio/storefront-data/cart/hooks"
import {
  createMedusaCartService,
  type MedusaCompleteCartResult,
} from "@techsio/storefront-data/cart/medusa-service"
import type {
  AddLineItemInputBase,
  CartCreateInputBase,
  UpdateCartInputBase,
  UpdateLineItemInputBase,
} from "@techsio/storefront-data/cart/types"
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import { isNotFoundError } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"
import type { Cart } from "@/types/cart"
import {
  type AddressFormData,
  validateAddressForm,
} from "@/utils/address-validation"
import { cartQueryKeys } from "./cart-query-keys"

const CART_ID_KEY = "n1_cart_id"

type CartIdListener = () => void
const cartIdListeners = new Set<CartIdListener>()

const readStoredCartId = (): string | null => {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(CART_ID_KEY)
}

const notifyCartIdListeners = () => {
  for (const listener of cartIdListeners) {
    listener()
  }
}

const subscribeToCartId = (listener: CartIdListener) => {
  cartIdListeners.add(listener)

  if (typeof window === "undefined") {
    return () => {
      cartIdListeners.delete(listener)
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CART_ID_KEY) {
      listener()
    }
  }

  window.addEventListener("storage", handleStorage)

  return () => {
    cartIdListeners.delete(listener)
    window.removeEventListener("storage", handleStorage)
  }
}

export const cartStorage = {
  getCartId(): string | null {
    return readStoredCartId()
  },
  setCartId(cartId: string): void {
    if (typeof window === "undefined") {
      return
    }

    if (localStorage.getItem(CART_ID_KEY) === cartId) {
      return
    }

    localStorage.setItem(CART_ID_KEY, cartId)
    notifyCartIdListeners()
  },
  clearCartId(): void {
    if (typeof window === "undefined") {
      return
    }

    if (localStorage.getItem(CART_ID_KEY) === null) {
      return
    }

    localStorage.removeItem(CART_ID_KEY)
    notifyCartIdListeners()
  },
  subscribe: subscribeToCartId,
  getSnapshot: readStoredCartId,
  getServerSnapshot: () => null,
}

const storefrontCacheConfig = createCacheConfig({
  realtime: {
    ...appCacheConfig.realtime,
    refetchOnMount: true,
  },
  userData: appCacheConfig.userData,
})

const cleanAddress = (address: AddressFormData): HttpTypes.StoreAddAddress => {
  const cleaned: HttpTypes.StoreAddAddress = {
    first_name: address.first_name,
    last_name: address.last_name,
    address_1: address.address_1,
    city: address.city,
    postal_code: address.postal_code,
    country_code: address.country_code,
  }

  if (address.address_2?.trim()) {
    cleaned.address_2 = address.address_2
  }
  if (address.company?.trim()) {
    cleaned.company = address.company
  }
  if (address.province?.trim()) {
    cleaned.province = address.province
  }
  if (address.phone?.trim()) {
    cleaned.phone = address.phone
  }

  return cleaned
}

const validateAddressInput = (input: AddressFormData) => {
  const errors = validateAddressForm(input)
  const messages = Object.values(errors).filter(Boolean)
  return messages.length ? messages : null
}

const buildCreateParams = (
  input: CartCreateInputBase
): HttpTypes.StoreCreateCart => {
  const { region_id, email, metadata, salesChannelId } = input

  return {
    ...(region_id ? { region_id } : {}),
    ...(email ? { email } : {}),
    ...(metadata ? { metadata } : {}),
    ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
  }
}

const buildUpdateParams = (
  input: UpdateCartInputBase & Record<string, unknown>
): HttpTypes.StoreUpdateCart => {
  const {
    region_id,
    email,
    metadata,
    shipping_address,
    billing_address,
    country_code: _countryCode,
    cartId: _cartId,
    salesChannelId,
    enabled: _enabled,
    autoCreate: _autoCreate,
    autoUpdateRegion: _autoUpdateRegion,
    ...rest
  } = input

  return {
    ...(region_id ? { region_id } : {}),
    ...(email ? { email } : {}),
    ...(metadata ? { metadata } : {}),
    ...(shipping_address ? { shipping_address } : {}),
    ...(billing_address ? { billing_address } : {}),
    ...(rest as Partial<HttpTypes.StoreUpdateCart>),
    ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
  }
}

const buildAddParams = (
  input: AddLineItemInputBase
): HttpTypes.StoreAddCartLineItem => ({
  variant_id: input.variantId,
  quantity: input.quantity ?? 1,
  metadata: input.metadata,
})

const cartService = createMedusaCartService(sdk, { isNotFoundError })

export const retrieveCartById = (cartId: string, signal?: AbortSignal) =>
  cartService.retrieveCart(cartId, signal)

export const cartHooks = createCartHooks<
  Cart,
  CartCreateInputBase,
  HttpTypes.StoreCreateCart,
  UpdateCartInputBase,
  HttpTypes.StoreUpdateCart,
  AddLineItemInputBase,
  HttpTypes.StoreAddCartLineItem,
  UpdateLineItemInputBase,
  HttpTypes.StoreUpdateCartLineItem,
  MedusaCompleteCartResult,
  AddressFormData,
  HttpTypes.StoreAddAddress
>({
  service: cartService,
  buildCreateParams,
  buildUpdateParams,
  buildAddParams,
  queryKeys: cartQueryKeys,
  queryKeyNamespace: "n1",
  cacheConfig: storefrontCacheConfig,
  cartStorage,
  isNotFoundError,
  invalidateOnSuccess: true,
  validateShippingAddressInput: validateAddressInput,
  validateBillingAddressInput: validateAddressInput,
  buildShippingAddress: cleanAddress,
  buildBillingAddress: cleanAddress,
})
