import type { HttpTypes } from "@medusajs/types";
import {
  createMedusaCartService,
  type MedusaCartAddItemParams,
  type MedusaCartCreateParams,
  type MedusaCartUpdateItemParams,
  type MedusaCartUpdateParams,
} from "@techsio/storefront-data";
import { storefrontSdk } from "../sdk";

const baseCartService = createMedusaCartService(storefrontSdk);

export const cartService = {
  async retrieveCart(
    cartId: string,
    _signal?: AbortSignal,
  ): Promise<HttpTypes.StoreCart | null> {
    try {
      const { cart } = await storefrontSdk.store.cart.retrieve(cartId);

      return cart ?? null;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error as { status: number }).status === 404
      ) {
        return null;
      }

      throw error;
    }
  },
  async createCart(params: MedusaCartCreateParams): Promise<HttpTypes.StoreCart> {
    const { cart } = await storefrontSdk.store.cart.create(params);
    if (!cart) {
      throw new Error("Failed to create cart");
    }

    return cart;
  },
  async updateCart(
    cartId: string,
    params: MedusaCartUpdateParams,
  ): Promise<HttpTypes.StoreCart> {
    const { cart } = await storefrontSdk.store.cart.update(cartId, params);
    if (!cart) {
      throw new Error("Failed to update cart");
    }

    return cart;
  },
  async addLineItem(
    cartId: string,
    params: MedusaCartAddItemParams,
  ): Promise<HttpTypes.StoreCart> {
    if (!baseCartService.addLineItem) {
      throw new Error("addLineItem service is not configured");
    }

    return baseCartService.addLineItem(cartId, params);
  },
  async updateLineItem(
    cartId: string,
    lineItemId: string,
    params: MedusaCartUpdateItemParams,
  ): Promise<HttpTypes.StoreCart> {
    const { cart } = await storefrontSdk.store.cart.updateLineItem(
      cartId,
      lineItemId,
      params,
    );
    if (!cart) {
      throw new Error("Failed to update line item");
    }

    return cart;
  },
  async removeLineItem(
    cartId: string,
    lineItemId: string,
  ): Promise<HttpTypes.StoreCart> {
    const { parent } = await storefrontSdk.store.cart.deleteLineItem(
      cartId,
      lineItemId,
    );
    if (!parent) {
      throw new Error("Failed to remove line item");
    }

    return parent;
  },
  async transferCart(cartId: string): Promise<HttpTypes.StoreCart> {
    const { cart } = await storefrontSdk.store.cart.transferCart(cartId);
    if (!cart) {
      throw new Error("Failed to transfer cart");
    }

    return cart;
  },
  completeCart: baseCartService.completeCart,
};
