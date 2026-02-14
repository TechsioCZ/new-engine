import type { HttpTypes } from "@medusajs/types";
import {
  createCartHooks,
  createCartQueryKeys,
  createMedusaCartService,
  type AddLineItemInputBase,
  type CartCreateInputBase,
  type MedusaCartAddItemParams,
  type MedusaCartCreateParams,
  type MedusaCartUpdateItemParams,
  type MedusaCartUpdateParams,
  type UpdateCartInputBase,
} from "@techsio/storefront-data";
import { cartStorage } from "./cart-storage";
import { storefrontCacheConfig } from "./cache";
import { REGION_STORAGE_KEY } from "./region-preferences";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

export const cartQueryKeys = createCartQueryKeys(
  STOREFRONT_QUERY_KEY_NAMESPACE,
);

const baseCartService = createMedusaCartService(storefrontSdk);

const getPreferredRegionId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(REGION_STORAGE_KEY);
};

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
    const preferredRegionId = getPreferredRegionId();
    let resolvedCartId = cartId;

    if (preferredRegionId) {
      try {
        const { cart: existingCart } = await storefrontSdk.store.cart.retrieve(
          cartId,
          { fields: "id,region_id" },
        );

        const existingRegionId = existingCart?.region_id ?? null;

        if (existingRegionId && existingRegionId !== preferredRegionId) {
          const { cart: regionSyncedCart } = await storefrontSdk.store.cart.update(
            cartId,
            { region_id: preferredRegionId },
          );

          if (regionSyncedCart?.id) {
            resolvedCartId = regionSyncedCart.id;
          }
        }
      } catch {
        // Best-effort only: fallback to original cart id on sync failure.
      }
    }

    await storefrontSdk.store.cart.createLineItem(resolvedCartId, params);

    const { cart } = await storefrontSdk.store.cart.retrieve(resolvedCartId);
    if (!cart) {
      throw new Error("Failed to add item to cart");
    }

    return cart;
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

type CartPayloadInput = Record<string, unknown> & { salesChannelId?: string };

const normalizeCartPayload = (input: CartPayloadInput) => {
  const {
    cartId: _cartId,
    autoCreate: _autoCreate,
    autoUpdateRegion: _autoUpdateRegion,
    enabled: _enabled,
    variantId: _variantId,
    quantity: _quantity,
    useSameAddress: _useSameAddress,
    shippingAddress: _shippingAddress,
    billingAddress: _billingAddress,
    country_code: _countryCode,
    salesChannelId,
    ...rest
  } = input;

  if (salesChannelId) {
    return {
      ...rest,
      sales_channel_id: salesChannelId,
    };
  }

  return rest;
};

const buildCreateCartParams = (
  input: CartCreateInputBase,
): MedusaCartCreateParams => {
  return normalizeCartPayload(input as CartPayloadInput) as MedusaCartCreateParams;
};

const buildUpdateCartParams = (
  input: UpdateCartInputBase,
): MedusaCartUpdateParams => {
  return normalizeCartPayload(input as CartPayloadInput) as MedusaCartUpdateParams;
};

const buildAddLineItemParams = (
  input: AddLineItemInputBase,
): MedusaCartAddItemParams => {
  const {
    cartId: _cartId,
    autoCreate: _autoCreate,
    autoUpdateRegion: _autoUpdateRegion,
    enabled: _enabled,
    region_id: _regionId,
    country_code: _countryCode,
    salesChannelId: _salesChannelId,
    variantId,
    ...rest
  } = input as AddLineItemInputBase & Record<string, unknown>;

  return {
    ...(rest as Omit<MedusaCartAddItemParams, "variant_id">),
    variant_id: variantId,
  };
};

export const cartHooks = createCartHooks({
  service: cartService,
  queryKeys: cartQueryKeys,
  cacheConfig: storefrontCacheConfig,
  cartStorage,
  requireRegion: true,
  buildCreateParams: buildCreateCartParams,
  buildUpdateParams: buildUpdateCartParams,
  buildAddParams: buildAddLineItemParams,
});

export const {
  useCart,
  useSuspenseCart,
  useCreateCart,
  useUpdateCart,
  useUpdateCartAddress,
  useAddLineItem,
  useUpdateLineItem,
  useRemoveLineItem,
  useTransferCart,
  useCompleteCart,
  usePrefetchCart,
} = cartHooks;
