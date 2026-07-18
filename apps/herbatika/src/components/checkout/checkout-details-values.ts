import type { HttpTypes } from "@medusajs/types"

import { resolveAddressFormsMatch } from "@/components/checkout/checkout-address.utils"
import {
  CHECKOUT_ADDRESS_FIELDS,
  type CheckoutAddressValues,
  type CheckoutDetailsValues,
  DEFAULT_CHECKOUT_ADDRESS_VALUES,
} from "@/lib/forms/checkout/address.form"
import { mapHerbatikaAddressFormStateFromMedusaAddress } from "@/lib/storefront/cart/address-adapter"

import { readAccountSetupRequested } from "./account-setup-metadata"
import type { CarrierPickupAddress } from "./carrier-pickup-address.utils"

export const mergeCheckoutAddressValues = (
  ...sources: Array<Partial<CheckoutAddressValues> | null | undefined>
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
  const hasCarrierPickupAddress = Boolean(carrierPickupAddress)
  const shippingAddress =
    cart?.shipping_address ??
    (hasCarrierPickupAddress ? undefined : cart?.billing_address)
  const billingAddress =
    cart?.billing_address ??
    (hasCarrierPickupAddress ? undefined : cart?.shipping_address)
  const resolvedShippingAddressValues =
    mapHerbatikaAddressFormStateFromMedusaAddress(shippingAddress)
  const resolvedBillingAddressValues =
    mapHerbatikaAddressFormStateFromMedusaAddress(billingAddress)
  const shippingAddressValues = mergeCheckoutAddressValues(
    {
      email: cart?.email ?? customer?.email ?? "",
      firstName: customer?.first_name ?? "",
      lastName: customer?.last_name ?? "",
      ...(regionCountryCode === undefined
        ? {}
        : { countryCode: regionCountryCode.toUpperCase() }),
    },
    resolvedShippingAddressValues,
    carrierPickupAddress?.address
  )
  const billingAddressValues = mergeCheckoutAddressValues(
    {
      firstName: shippingAddressValues.firstName,
      lastName: shippingAddressValues.lastName,
      phone: shippingAddressValues.phone,
      countryCode: shippingAddressValues.countryCode,
      ...(hasCarrierPickupAddress
        ? {}
        : {
            company: shippingAddressValues.company,
            companyId: shippingAddressValues.companyId,
            taxId: shippingAddressValues.taxId,
            vatId: shippingAddressValues.vatId,
            address1: shippingAddressValues.address1,
            address2: shippingAddressValues.address2,
            city: shippingAddressValues.city,
            postalCode: shippingAddressValues.postalCode,
          }),
    },
    resolvedBillingAddressValues
  )
  const hasHydratedAddress = Boolean(shippingAddress || billingAddress)
  let useSameAddress = true
  if (hasCarrierPickupAddress) {
    useSameAddress = false
  } else if (hasHydratedAddress) {
    useSameAddress = resolveAddressFormsMatch(
      shippingAddressValues,
      billingAddressValues
    )
  }

  return {
    shipping: shippingAddressValues,
    billing: billingAddressValues,
    useSameAddress,
    isCompanyPurchase: Boolean(
      billingAddress?.company ??
      (hasCarrierPickupAddress ? undefined : shippingAddress?.company)
    ),
    accountSetupRequested: readAccountSetupRequested(cart?.metadata),
    marketingConsent: false,
    heurekaConsent: false,
  }
}
