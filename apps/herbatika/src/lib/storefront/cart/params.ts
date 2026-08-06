import { isRecord, omitKeys, getRecordValue } from "@techsio/std/object"
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

type CartPayloadInput = (CartCreateInputBase | UpdateCartInputBase) & {
  autoCreate?: unknown
  autoUpdateRegion?: unknown
  billingAddress?: unknown
  cartId?: unknown
  enabled?: unknown
  quantity?: unknown
  shippingAddress?: unknown
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

const normalizeAddressPayload = (
  value: unknown,
): Record<string, unknown> | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  let address = { ...value }
  const fieldAliases: [camel: string, snake: string][] = [
    ["firstName", "first_name"],
    ["lastName", "last_name"],
    ["address1", "address_1"],
    ["address2", "address_2"],
    ["postalCode", "postal_code"],
    ["countryCode", "country_code"],
  ]

  for (const [camel, snake] of fieldAliases) {
    if (address[snake] === undefined && address[camel] !== undefined) {
      address = {
        ...omitKeys(address, [camel]),
        [snake]: address[camel],
      }
    }
  }

  return address
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
  const normalizedShippingAddress = normalizeAddressPayload(shippingAddress)
  const rawBillingAddress = normalizeAddressPayload(billingAddressInput)
  const billingAddress = rawBillingAddress
    ? omitKeys(rawBillingAddress, ["countryCode"])
    : undefined
  const hasShippingAddress =
    normalizedShippingAddress !== undefined ||
    (normalizedCountryCode ?? "").length > 0
  let nextShippingAddress = normalizedShippingAddress
    ? omitKeys(normalizedShippingAddress, ["countryCode"])
    : {}

  if (
    (normalizedCountryCode ?? "").length > 0 &&
    getRecordValue(nextShippingAddress, "country_code") === undefined
  ) {
    nextShippingAddress = {
      ...nextShippingAddress,
      country_code: normalizedCountryCode,
    }
  }

  return {
    ...omitKeys(input, NORMALIZED_CART_INPUT_KEYS),
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
