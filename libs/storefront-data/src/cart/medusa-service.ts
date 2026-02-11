import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { CartService } from "./types"

export type MedusaCartServiceConfig = {
  isNotFoundError?: (error: unknown) => boolean
}

export type MedusaCartCreateParams = HttpTypes.StoreCreateCart
export type MedusaCartUpdateParams = HttpTypes.StoreUpdateCart
export type MedusaCartAddItemParams = HttpTypes.StoreAddCartLineItem
export type MedusaCartUpdateItemParams = HttpTypes.StoreUpdateCartLineItem

export type MedusaCompleteCartResult =
  | { type: "order"; order: HttpTypes.StoreOrder }
  | {
      type: "cart"
      cart: HttpTypes.StoreCart
      error: { message: string; name: string; type: string }
    }

/**
 * Creates a CartService for Medusa SDK
 *
 * @example
 * ```typescript
 * import { createCartHooks, createMedusaCartService } from "@techsio/storefront-data"
 * import { sdk } from "@/lib/medusa-client"
 *
 * const cartHooks = createCartHooks({
 *   service: createMedusaCartService(sdk),
 *   queryKeys: cartQueryKeys,
 *   cartStorage: {
 *     getCartId: () => localStorage.getItem("cart_id"),
 *     setCartId: (id) => localStorage.setItem("cart_id", id),
 *     clearCartId: () => localStorage.removeItem("cart_id"),
 *   },
 * })
 * ```
 */
export function createMedusaCartService(
  sdk: Medusa,
  _config?: MedusaCartServiceConfig
): CartService<
  HttpTypes.StoreCart,
  MedusaCartCreateParams,
  MedusaCartUpdateParams,
  MedusaCartAddItemParams,
  MedusaCartUpdateItemParams,
  MedusaCompleteCartResult
> {
  return {
    async retrieveCart(
      cartId: string,
      _signal?: AbortSignal
    ): Promise<HttpTypes.StoreCart | null> {
      try {
        const { cart } = await sdk.store.cart.retrieve(cartId)
        return cart ?? null
      } catch (error: unknown) {
        // Handle 404 as null (cart not found)
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as { status: number }).status === 404
        ) {
          return null
        }
        throw error
      }
    },

    async createCart(
      params: MedusaCartCreateParams
    ): Promise<HttpTypes.StoreCart> {
      const { cart } = await sdk.store.cart.create(params)
      if (!cart) {
        throw new Error("Failed to create cart")
      }
      return cart
    },

    async updateCart(
      cartId: string,
      params: MedusaCartUpdateParams
    ): Promise<HttpTypes.StoreCart> {
      const { cart } = await sdk.store.cart.update(cartId, params)
      if (!cart) {
        throw new Error("Failed to update cart")
      }
      return cart
    },

    async addLineItem(
      cartId: string,
      params: MedusaCartAddItemParams
    ): Promise<HttpTypes.StoreCart> {
      const { cart } = await sdk.store.cart.createLineItem(cartId, params)
      if (!cart) {
        throw new Error("Failed to add item to cart")
      }
      return cart
    },

    async updateLineItem(
      cartId: string,
      lineItemId: string,
      params: MedusaCartUpdateItemParams
    ): Promise<HttpTypes.StoreCart> {
      const { cart } = await sdk.store.cart.updateLineItem(
        cartId,
        lineItemId,
        params
      )
      if (!cart) {
        throw new Error("Failed to update line item")
      }
      return cart
    },

    async removeLineItem(
      cartId: string,
      lineItemId: string
    ): Promise<HttpTypes.StoreCart> {
      const { parent } = await sdk.store.cart.deleteLineItem(cartId, lineItemId)
      if (!parent) {
        throw new Error("Failed to remove line item")
      }
      return parent
    },

    async transferCart(cartId: string): Promise<HttpTypes.StoreCart> {
      const { cart } = await sdk.store.cart.transferCart(cartId)
      if (!cart) {
        throw new Error("Failed to transfer cart")
      }
      return cart
    },

    async completeCart(cartId: string): Promise<MedusaCompleteCartResult> {
      const result = await sdk.store.cart.complete(cartId)
      return result
    },
  }
}
