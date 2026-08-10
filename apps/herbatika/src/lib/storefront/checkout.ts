"use client"

import { storefront } from "./storefront"

export { resolveSelectedPaymentProviderId } from "@techsio/storefront-data/shared/checkout-flow-utils"

const checkoutHooks: typeof storefront.hooks.checkout =
  storefront.hooks.checkout

export const fetchPaymentProviders: typeof checkoutHooks.fetchPaymentProviders =
  checkoutHooks.fetchPaymentProviders
