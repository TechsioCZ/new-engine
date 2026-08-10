import { getRecordValue, omitKeys, omitUndefined } from "@techsio/std/object"
import type {
  MedusaCartAddItemParams,
  MedusaCartCreateParams,
  MedusaCartUpdateParams,
} from "@techsio/storefront-data/cart/medusa-service"
import type {
  AddLineItemInputBase,
  CartCreateInputBase,
  UpdateCartInputBase,
} from "@techsio/storefront-data/cart/types"

import type { HerbatikaCheckoutAddressPayload } from "./address-adapter"

type CartPayloadInput = (CartCreateInputBase | UpdateCartInputBase) & {
  autoCreate?: unknown
  autoUpdateRegion?: unknown
  billingAddress?: HerbatikaCheckoutAddressPayload
  cartId?: unknown
  enabled?: unknown
  quantity?: unknown
  shippingAddress?: HerbatikaCheckoutAddressPayload
  useSameAddress?: unknown
  variantId?: unknown
}

const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/u

const normalizeCountryCode = (value: unknown): string | undefined => {
  let countryCode: string | undefined

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    countryCode = COUNTRY_CODE_PATTERN.test(normalized) ? normalized : undefined
  }

  return countryCode
}

const NORMALIZED_CART_INPUT_KEYS = [
  "cartId",
  "autoCreate",
  "autoUpdateRegion",
  "enabled",
  "variantId",
  "quantity",
  "useSameAddress",
  "shippingAddress",
  "billingAddress",
  "country_code",
  "salesChannelId",
] as const

const normalizeCartPayload = (input: CartPayloadInput) => {
  const {
    billingAddress: billingAddressInput,
    country_code: countryCode,
    shippingAddress,
  } = input
  const normalizedCountryCode = normalizeCountryCode(countryCode)
  const normalizedShippingAddress = shippingAddress
  const billingAddress = billingAddressInput
  const hasShippingAddress =
    normalizedShippingAddress !== undefined ||
    (normalizedCountryCode ?? "").length > 0
  let nextShippingAddress: HerbatikaCheckoutAddressPayload =
    normalizedShippingAddress ?? {}

  if (
    normalizedCountryCode !== undefined &&
    getRecordValue(nextShippingAddress, "country_code") === undefined
  ) {
    nextShippingAddress = {
      ...nextShippingAddress,
      country_code: normalizedCountryCode,
    }
  }

  return {
    ...omitUndefined(omitKeys(input, NORMALIZED_CART_INPUT_KEYS)),
    ...((input.salesChannelId ?? "").length > 0
      ? { sales_channel_id: input.salesChannelId }
      : {}),
    ...(hasShippingAddress ? { shipping_address: nextShippingAddress } : {}),
    ...(billingAddress ? { billing_address: billingAddress } : {}),
  }
}

export const buildCreateCartParams = (
  input: CartCreateInputBase,
): MedusaCartCreateParams => normalizeCartPayload(input)

export const buildUpdateCartParams = (
  input: UpdateCartInputBase,
): MedusaCartUpdateParams => normalizeCartPayload(input)

export const buildCreateCartInputFromAddLineItemInput = (
  input: AddLineItemInputBase,
): CartCreateInputBase => omitKeys(input, ["metadata"])

export const buildAddLineItemParams = (
  input: AddLineItemInputBase,
): MedusaCartAddItemParams => {
  const params: MedusaCartAddItemParams = {
    quantity: input.quantity ?? 1,
    variant_id: input.variantId,
  }
  if (input.metadata !== undefined) {
    params.metadata = input.metadata
  }
  return params
}
