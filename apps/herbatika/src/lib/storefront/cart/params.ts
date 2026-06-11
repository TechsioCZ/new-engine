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

type CartPayloadInput = Record<string, unknown> & { salesChannelId?: string }

const normalizeCountryCode = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim().toLowerCase()
  if (!/^[a-z]{2}$/.test(normalized)) {
    return
  }

  return normalized
}

const normalizeAddressPayload = (
  value: unknown
): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return
  }

  const address = { ...(value as Record<string, unknown>) }
  const fieldAliases: [camel: string, snake: string][] = [
    ["firstName", "first_name"],
    ["lastName", "last_name"],
    ["address1", "address_1"],
    ["address2", "address_2"],
    ["postalCode", "postal_code"],
    ["countryCode", "country_code"],
  ]

  for (const [camel, snake] of fieldAliases) {
    if (address[snake] !== undefined || address[camel] === undefined) {
      continue
    }

    address[snake] = address[camel]
    delete address[camel]
  }

  return address
}

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
  } = input

  const normalizedCountryCode = normalizeCountryCode(_countryCode)
  const shippingAddress = normalizeAddressPayload(_shippingAddress)
  const billingAddress = normalizeAddressPayload(_billingAddress)

  const resolvedShippingAddress = (() => {
    if (!(shippingAddress || normalizedCountryCode)) {
      return
    }

    const nextShippingAddress = shippingAddress ?? {}
    if (nextShippingAddress.countryCode !== undefined) {
      nextShippingAddress.countryCode = undefined
    }
    if (
      normalizedCountryCode &&
      nextShippingAddress.country_code === undefined
    ) {
      nextShippingAddress.country_code = normalizedCountryCode
    }

    return nextShippingAddress
  })()

  if (billingAddress?.countryCode !== undefined) {
    billingAddress.countryCode = undefined
  }

  const payload = {
    ...rest,
    ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
    ...(resolvedShippingAddress
      ? { shipping_address: resolvedShippingAddress }
      : {}),
    ...(billingAddress ? { billing_address: billingAddress } : {}),
  }

  return payload
}

export const buildCreateCartParams = (
  input: CartCreateInputBase
): MedusaCartCreateParams =>
  normalizeCartPayload(input as CartPayloadInput) as MedusaCartCreateParams

export const buildUpdateCartParams = (
  input: UpdateCartInputBase
): MedusaCartUpdateParams =>
  normalizeCartPayload(input as CartPayloadInput) as MedusaCartUpdateParams

export const buildCreateCartInputFromAddLineItemInput = (
  input: AddLineItemInputBase
): CartCreateInputBase => {
  const { metadata: _lineItemMetadata, ...rest } = input
  return rest as CartCreateInputBase
}

export const buildAddLineItemParams = (
  input: AddLineItemInputBase
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
  } = input as AddLineItemInputBase & Record<string, unknown>

  return {
    ...(rest as Omit<MedusaCartAddItemParams, "variant_id">),
    variant_id: variantId,
  }
}
