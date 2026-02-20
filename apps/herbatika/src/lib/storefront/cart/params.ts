import type {
  AddLineItemInputBase,
  CartCreateInputBase,
  MedusaCartAddItemParams,
  MedusaCartCreateParams,
  MedusaCartUpdateParams,
  UpdateCartInputBase,
} from "@techsio/storefront-data";

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

export const buildCreateCartParams = (
  input: CartCreateInputBase,
): MedusaCartCreateParams => {
  return normalizeCartPayload(input as CartPayloadInput) as MedusaCartCreateParams;
};

export const buildUpdateCartParams = (
  input: UpdateCartInputBase,
): MedusaCartUpdateParams => {
  return normalizeCartPayload(input as CartPayloadInput) as MedusaCartUpdateParams;
};

export const buildAddLineItemParams = (
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
