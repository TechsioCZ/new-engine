"use client"

import { storefront } from "./storefront"

export { resolveSelectedPaymentProviderId } from "@techsio/storefront-data/shared/checkout-flow-utils"

const checkoutHooks = storefront.hooks.checkout

export const { fetchPaymentProviders } = checkoutHooks
