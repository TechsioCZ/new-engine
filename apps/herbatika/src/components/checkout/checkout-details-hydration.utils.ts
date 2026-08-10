import type { HttpTypes } from "@medusajs/types"

import { resolveAddressFormsMatch } from "@/components/checkout/checkout-address.utils"
import {
  CHECKOUT_ADDRESS_FIELDS,
  DEFAULT_CHECKOUT_ADDRESS_VALUES,
} from "@/lib/forms/checkout/address.form"
import type {
  CheckoutAddressValues,
  CheckoutDetailsValues,
} from "@/lib/forms/checkout/address.form"
import { mapHerbatikaAddressFormStateFromMedusaAddress } from "@/lib/storefront/cart/address-adapter"

import { readAccountSetupRequested } from "./account-setup-metadata"
import type { CarrierPickupAddress } from "./carrier-pickup-address.utils"

export const mergeCheckoutAddressValues = (
  ...sources: (Partial<CheckoutAddressValues> | null | undefined)[]
): CheckoutAddressValues => {
  const nextValues = { ...DEFAULT_CHECKOUT_ADDRESS_VALUES }

  for (const source of sources) {
    if (!source) {
      continue
    }

    for (const field of CHECKOUT_ADDRESS_FIELDS) {
      const value = source[field]

      if (typeof value === "string") {
        nextValues[field] = value
      }
    }
  }

  return nextValues
}

const resolveHydratedAddresses = (
  cart: HttpTypes.StoreCart | null | undefined,
  hasCarrierPickupAddress: boolean,
) => {
  if (hasCarrierPickupAddress) {
    return {
      billingAddress: cart?.billing_address,
      shippingAddress: cart?.shipping_address,
    }
  }

  return {
    billingAddress: cart?.billing_address ?? cart?.shipping_address,
    shippingAddress: cart?.shipping_address ?? cart?.billing_address,
  }
}

const resolveCountryOverride = (regionCountryCode?: string) => {
  const marketCountryCode = regionCountryCode?.toUpperCase()
  return marketCountryCode === undefined || marketCountryCode.length === 0
    ? {}
    : { countryCode: marketCountryCode }
}

const resolveBillingDefaults = (
  shippingAddressValues: CheckoutAddressValues,
  hasCarrierPickupAddress: boolean,
) => {
  const sharedDefaults = {
    countryCode: shippingAddressValues.countryCode,
    firstName: shippingAddressValues.firstName,
    lastName: shippingAddressValues.lastName,
    phone: shippingAddressValues.phone,
  }
  if (hasCarrierPickupAddress) {
    return sharedDefaults
  }

  return {
    ...sharedDefaults,
    address1: shippingAddressValues.address1,
    address2: shippingAddressValues.address2,
    city: shippingAddressValues.city,
    company: shippingAddressValues.company,
    companyId: shippingAddressValues.companyId,
    postalCode: shippingAddressValues.postalCode,
    taxId: shippingAddressValues.taxId,
    vatId: shippingAddressValues.vatId,
  }
}

const resolveUseSameAddress = ({
  billingAddressValues,
  hasCarrierPickupAddress,
  hasHydratedAddress,
  shippingAddressValues,
}: {
  billingAddressValues: CheckoutAddressValues
  hasCarrierPickupAddress: boolean
  hasHydratedAddress: boolean
  shippingAddressValues: CheckoutAddressValues
}) => {
  if (hasCarrierPickupAddress) {
    return false
  }
  if (hasHydratedAddress) {
    return resolveAddressFormsMatch(shippingAddressValues, billingAddressValues)
  }
  return true
}

export const resolveCheckoutHydratedValues = ({
  carrierPickupAddress,
  cart,
  customer,
  regionCountryCode,
}: {
  carrierPickupAddress: CarrierPickupAddress | null
  cart: HttpTypes.StoreCart | null | undefined
  customer: HttpTypes.StoreCustomer | null | undefined
  regionCountryCode?: string
}): CheckoutDetailsValues => {
  const hasCarrierPickupAddress = carrierPickupAddress !== null
  const { billingAddress, shippingAddress } = resolveHydratedAddresses(
    cart,
    hasCarrierPickupAddress,
  )
  const resolvedShippingAddressValues =
    mapHerbatikaAddressFormStateFromMedusaAddress(shippingAddress)
  const resolvedBillingAddressValues =
    mapHerbatikaAddressFormStateFromMedusaAddress(billingAddress)
  const countryOverride = resolveCountryOverride(regionCountryCode)
  const shippingAddressValues = {
    ...mergeCheckoutAddressValues(
      {
        email: cart?.email ?? customer?.email ?? "",
        firstName: customer?.first_name ?? "",
        lastName: customer?.last_name ?? "",
      },
      resolvedShippingAddressValues,
      carrierPickupAddress?.address,
    ),
    ...countryOverride,
  }
  const billingAddressValues = {
    ...mergeCheckoutAddressValues(
      resolveBillingDefaults(shippingAddressValues, hasCarrierPickupAddress),
      resolvedBillingAddressValues,
    ),
    ...countryOverride,
  }
  const useSameAddress = resolveUseSameAddress({
    billingAddressValues,
    hasCarrierPickupAddress,
    hasHydratedAddress:
      shippingAddress !== undefined || billingAddress !== undefined,
    shippingAddressValues,
  })
  const company = hasCarrierPickupAddress
    ? billingAddress?.company
    : (billingAddress?.company ?? shippingAddress?.company)

  return {
    accountSetupRequested: readAccountSetupRequested(cart?.metadata),
    billing: billingAddressValues,
    heurekaConsent: false,
    isCompanyPurchase: typeof company === "string" && company.length > 0,
    marketingConsent: false,
    shipping: shippingAddressValues,
    useSameAddress,
  }
}
