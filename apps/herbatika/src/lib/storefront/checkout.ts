"use client"

import { resolveSelectedPaymentProviderId as resolveSelectedPaymentProviderIdShared } from "@techsio/storefront-data/shared/checkout-flow-utils"

import { storefront } from "./storefront"

const checkoutHooks = storefront.hooks.checkout

export const { fetchPaymentProviders } = checkoutHooks

export const resolveSelectedPaymentProviderId =
  resolveSelectedPaymentProviderIdShared
