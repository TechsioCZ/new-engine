import type { HttpTypes } from "@medusajs/types"

import { CartServiceError } from "@/lib/cart-service-error"
import { isNotFoundError } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"

export type Cart = HttpTypes.StoreCart
export type CartLineItem = HttpTypes.StoreCartLineItem
export type OptimisticCart = Cart & { _optimistic?: boolean }
export type CartLineItemMetadata = Readonly<{
  inventory_quantity: number
}>
export type OptimisticLineItem = CartLineItem & {
  _optimistic?: boolean
}

export type CompleteCartResult =
  | { success: true; order: HttpTypes.StoreOrder }
  | {
      success: false
      cart: HttpTypes.StoreCart
      error: {
        message: string
        type: string
        name?: string
      }
    }

const CART_ID_KEY = "n1_cart_id"
const CART_ID_REQUIRED_MESSAGE = "Cart ID je povinné"

const cartStorage = {
  clearCartId(): void {
    if (typeof window === "undefined") {
      return
    }
    localStorage.removeItem(CART_ID_KEY)
  },

  getCartId(): string | null {
    if (typeof window === "undefined") {
      return null
    }
    return localStorage.getItem(CART_ID_KEY)
  },

  setCartId(cartId: string): void {
    if (typeof window === "undefined") {
      return
    }
    localStorage.setItem(CART_ID_KEY, cartId)
  },
}

export const getCart = async (): Promise<Cart | null> => {
  try {
    const cartId = cartStorage.getCartId()

    if (cartId === null || cartId === "") {
      if (process.env.NODE_ENV === "development") {
        console.log("[CartService] No cart ID found")
      }
      return null
    }

    const { cart } = await sdk.store.cart.retrieve(cartId)

    if (cart === undefined || cart === null) {
      throw new CartServiceError(
        "Košík byl načten, ale je prázdný",
        "CART_NOT_FOUND",
      )
    }

    return cart
  } catch (error) {
    // 404 is expected - cart was deleted or expired
    if (isNotFoundError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.log("[CartService] Cart not found, clearing stored ID")
      }
      cartStorage.clearCartId()
      return null
    }

    // Other errors are unexpected
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }
    throw CartServiceError.fromMedusaError(error, "CART_NOT_FOUND")
  }
}

export const createCart = async (
  regionId: string,
  options?: {
    email?: string
    salesChannelId?: string
  },
): Promise<Cart> => {
  try {
    if (!regionId) {
      throw new CartServiceError(
        "Region ID je povinné pole",
        "CART_CREATION_FAILED",
      )
    }

    const response = await sdk.store.cart.create({
      region_id: regionId,
      ...(options?.email !== undefined && options.email !== ""
        ? { email: options.email }
        : {}),
      ...(options?.salesChannelId !== undefined && options.salesChannelId !== ""
        ? { sales_channel_id: options.salesChannelId }
        : {}),
    })

    if (response.cart === undefined || response.cart === null) {
      throw new CartServiceError(
        "Nepodařilo se vytvořit košík",
        "CART_CREATION_FAILED",
      )
    }

    cartStorage.setCartId(response.cart.id)

    if (process.env.NODE_ENV === "development") {
      console.log("[CartService] Cart created:", response.cart.id)
    }

    return response.cart
  } catch (error) {
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }
    throw CartServiceError.fromMedusaError(error, "CART_CREATION_FAILED")
  }
}

export const addToCart = async (
  cartId: string,
  variantId: string,
  quantity = 1,
  metadata?: CartLineItemMetadata,
): Promise<Cart> => {
  try {
    if (!(cartId && variantId)) {
      throw new CartServiceError(
        "Cart ID a Variant ID jsou povinné",
        "ITEM_ADD_FAILED",
      )
    }

    if (quantity < 1) {
      throw new CartServiceError(
        "Množství musí být alespoň 1",
        "ITEM_ADD_FAILED",
      )
    }

    const response = await sdk.store.cart.createLineItem(cartId, {
      quantity,
      variant_id: variantId,
      ...(metadata ? { metadata } : {}),
    })

    if (response.cart === undefined || response.cart === null) {
      throw new CartServiceError(
        "Nepodařilo se přidat položku do košíku",
        "ITEM_ADD_FAILED",
      )
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[CartService] Item added to cart:", {
        metadata,
        quantity,
        variantId,
      })
    }

    return response.cart
  } catch (error) {
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }
    throw CartServiceError.fromMedusaError(error, "ITEM_ADD_FAILED")
  }
}

export const updateLineItem = async (
  cartId: string,
  lineItemId: string,
  quantity: number,
): Promise<Cart> => {
  try {
    if (!(cartId && lineItemId)) {
      throw new CartServiceError(
        "Cart ID a Line Item ID jsou povinné",
        "ITEM_UPDATE_FAILED",
      )
    }

    if (quantity < 1) {
      throw new CartServiceError(
        "Množství musí být alespoň 1",
        "ITEM_UPDATE_FAILED",
      )
    }

    const response = await sdk.store.cart.updateLineItem(cartId, lineItemId, {
      quantity,
    })

    if (response.cart === undefined || response.cart === null) {
      throw new CartServiceError(
        "Nepodařilo se aktualizovat položku",
        "ITEM_UPDATE_FAILED",
      )
    }

    return response.cart
  } catch (error) {
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }
    throw CartServiceError.fromMedusaError(error, "ITEM_UPDATE_FAILED")
  }
}

export const removeLineItem = async (
  cartId: string,
  lineItemId: string,
): Promise<Cart> => {
  try {
    if (!(cartId && lineItemId)) {
      throw new CartServiceError(
        "Cart ID a Line Item ID jsou povinné",
        "ITEM_REMOVE_FAILED",
      )
    }

    const response = await sdk.store.cart.deleteLineItem(cartId, lineItemId)

    if (!response.parent) {
      throw new CartServiceError(
        "Nepodařilo se načíst aktualizovaný košík",
        "ITEM_REMOVE_FAILED",
      )
    }

    return response.parent
  } catch (error) {
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }
    throw CartServiceError.fromMedusaError(error, "ITEM_REMOVE_FAILED")
  }
}

export const getShippingOptions = async (
  cartId: string,
): Promise<HttpTypes.StoreCartShippingOption[]> => {
  try {
    if (!cartId) {
      throw new CartServiceError(
        CART_ID_REQUIRED_MESSAGE,
        "SHIPPING_NOT_AVAILABLE",
      )
    }

    // Use fulfillment.listCartOptions with cart_id
    const response = await sdk.store.fulfillment.listCartOptions({
      cart_id: cartId,
    })

    if (process.env.NODE_ENV === "development") {
      console.log("[CartService] Shipping options:", response.shipping_options)
    }

    return response.shipping_options ?? []
  } catch (error) {
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }
    throw CartServiceError.fromMedusaError(error, "SHIPPING_NOT_AVAILABLE")
  }
}

export const getPaymentProviders = async (regionId: string) => {
  try {
    if (!regionId) {
      throw new CartServiceError("Region ID je povinné", "PAYMENT_FAILED")
    }

    const response = await sdk.store.payment.listPaymentProviders({
      region_id: regionId,
    })

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[CartService] Payment providers:",
        response.payment_providers,
      )
    }

    return response.payment_providers ?? []
  } catch (error) {
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }
    throw CartServiceError.fromMedusaError(error, "PAYMENT_FAILED")
  }
}

/** Data for PPL Parcel access point selection */
export type ShippingMethodData = Readonly<{
  access_point_id?: string
  access_point_name?: string
  access_point_type?: string
  access_point_street?: string
  access_point_city?: string
  access_point_zip?: string
  access_point_country?: string
}>

const normalizeShippingMethodDataValue = (
  value: string | null | undefined,
): string | undefined =>
  value === undefined || value === null || value === "" ? undefined : value

const buildShippingMethodData = (
  data?: ShippingMethodData,
): ShippingMethodData => {
  const accessPointId = normalizeShippingMethodDataValue(data?.access_point_id)
  const accessPointName = normalizeShippingMethodDataValue(
    data?.access_point_name,
  )
  const accessPointType = normalizeShippingMethodDataValue(
    data?.access_point_type,
  )
  const accessPointStreet = normalizeShippingMethodDataValue(
    data?.access_point_street,
  )
  const accessPointCity = normalizeShippingMethodDataValue(
    data?.access_point_city,
  )
  const accessPointZip = normalizeShippingMethodDataValue(
    data?.access_point_zip,
  )
  const accessPointCountry = normalizeShippingMethodDataValue(
    data?.access_point_country,
  )

  return {
    ...(accessPointId === undefined ? {} : { access_point_id: accessPointId }),
    ...(accessPointName === undefined
      ? {}
      : { access_point_name: accessPointName }),
    ...(accessPointType === undefined
      ? {}
      : { access_point_type: accessPointType }),
    ...(accessPointStreet === undefined
      ? {}
      : { access_point_street: accessPointStreet }),
    ...(accessPointCity === undefined
      ? {}
      : { access_point_city: accessPointCity }),
    ...(accessPointZip === undefined
      ? {}
      : { access_point_zip: accessPointZip }),
    ...(accessPointCountry === undefined
      ? {}
      : { access_point_country: accessPointCountry }),
  }
}

export const setShippingMethod = async (
  cartId: string,
  optionId: string,
  data?: ShippingMethodData,
): Promise<Cart> => {
  try {
    if (!(cartId && optionId)) {
      throw new CartServiceError(
        "Cart ID a Option ID jsou povinné",
        "SHIPPING_SET_FAILED",
      )
    }

    // For PPL Parcel, send access point data; for regular shipping, send empty object
    // Filter out undefined/null/empty values to keep payload clean
    const shippingData = buildShippingMethodData(data)

    const response = await sdk.store.cart.addShippingMethod(cartId, {
      data: shippingData,
      option_id: optionId,
    })

    if (response.cart === undefined || response.cart === null) {
      throw new CartServiceError(
        "Nepodařilo se nastavit způsob dopravy",
        "SHIPPING_SET_FAILED",
      )
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[CartService] Shipping method set:", optionId)
    }

    return response.cart
  } catch (error) {
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }
    throw CartServiceError.fromMedusaError(error, "SHIPPING_SET_FAILED")
  }
}

/** Debug-only logger for payment sessions that already exist on a cart. */
const logExistingPaymentSessions = (cart: Cart): void => {
  if (process.env.NODE_ENV !== "development") {
    return
  }
  console.log("[CartService] Payment sessions already exist:", {
    collectionId: cart.payment_collection?.id,
    sessionCount: cart.payment_collection?.payment_sessions?.length ?? 0,
    sessions: cart.payment_collection?.payment_sessions?.map((s) => ({
      id: s.id,
      provider_id: s.provider_id,
      status: s.status,
    })),
  })
}

/** Debug-only logger for a newly initialized payment session. */
const logPaymentSessionInitialized = (
  paymentCollection: HttpTypes.StorePaymentCollection,
): void => {
  if (process.env.NODE_ENV !== "development") {
    return
  }
  console.log("[CartService] Payment session initialized:", {
    collectionId: paymentCollection.id,
    sessionCount: paymentCollection.payment_sessions?.length ?? 0,
    sessions: paymentCollection.payment_sessions?.map((s) => ({
      id: s.id,
      provider_id: s.provider_id,
      status: s.status,
    })),
  })
}

/** Debug-only logger for payment initialization failures. */
const logPaymentInitError = (error: unknown): void => {
  if (process.env.NODE_ENV !== "development") {
    return
  }
  console.error("[CartService] Payment initialization error:", error)
}

export const createPaymentCollection = async (
  cartId: string,
  providerId: string,
) => {
  try {
    if (!cartId) {
      throw new CartServiceError(
        CART_ID_REQUIRED_MESSAGE,
        "PAYMENT_INIT_FAILED",
      )
    }

    if (!providerId) {
      throw new CartServiceError(
        "Provider ID je povinné",
        "PAYMENT_INIT_FAILED",
      )
    }

    // Get current cart
    const { cart } = await sdk.store.cart.retrieve(cartId)

    if (cart === undefined || cart === null) {
      throw new CartServiceError("Košík nebyl nalezen", "PAYMENT_INIT_FAILED")
    }

    // Check if payment sessions already exist (early return optimization)
    if (
      cart.payment_collection?.payment_sessions?.length !== undefined &&
      cart.payment_collection.payment_sessions.length > 0
    ) {
      logExistingPaymentSessions(cart)
      return { payment_collection: cart.payment_collection }
    }

    // Use the provider selected by user (not hardcoded!)
    const response = await sdk.store.payment.initiatePaymentSession(cart, {
      provider_id: providerId,
    })

    if (
      response.payment_collection === undefined ||
      response.payment_collection === null
    ) {
      throw new CartServiceError(
        "Nepodařilo se inicializovat platební session",
        "PAYMENT_INIT_FAILED",
      )
    }

    logPaymentSessionInitialized(response.payment_collection)

    return response
  } catch (error) {
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }

    logPaymentInitError(error)
    throw CartServiceError.fromMedusaError(error, "PAYMENT_INIT_FAILED")
  }
}

export const completeCart = async (
  cartId: string,
): Promise<CompleteCartResult> => {
  try {
    if (!cartId) {
      throw new CartServiceError(
        CART_ID_REQUIRED_MESSAGE,
        "ORDER_CREATION_FAILED",
      )
    }

    // Debug: Check cart state before completing
    if (process.env.NODE_ENV === "development") {
      const { cart: currentCart } = await sdk.store.cart.retrieve(cartId)
      console.log("[CartService] Cart state before complete:", {
        hasPaymentCollection: !!currentCart.payment_collection,
        hasShippingMethod: !!currentCart.shipping_methods?.[0],
        paymentCollectionId: currentCart.payment_collection?.id,
        paymentSessions: currentCart.payment_collection?.payment_sessions?.map(
          (s) => ({
            id: s.id,
            provider_id: s.provider_id,
            status: s.status,
          }),
        ),
        paymentSessionsCount:
          currentCart.payment_collection?.payment_sessions?.length ?? 0,
        shippingMethodId: currentCart.shipping_methods?.[0]?.id,
      })
    }

    const response = await sdk.store.cart.complete(cartId)

    // Success case - SDK returned order
    if (response.type === "order") {
      // Clear cart ID from storage ONLY on success
      cartStorage.clearCartId()

      if (process.env.NODE_ENV === "development") {
        console.log(
          "[CartService] Cart completed, order created:",
          response.order.id,
        )
      }

      return {
        order: response.order,
        success: true,
      }
    }

    // Failure case - SDK returned cart with validation/payment error
    if (process.env.NODE_ENV === "development") {
      console.warn("[CartService] Cart completion failed:", response.error)
    }

    return {
      cart: response.cart,
      error: response.error,
      success: false,
    }
  } catch (error) {
    // Network errors or unexpected failures
    if (CartServiceError.isCartServiceError(error)) {
      throw error
    }
    throw CartServiceError.fromMedusaError(error, "ORDER_CREATION_FAILED")
  }
}
