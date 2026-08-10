import { appHref } from "@/lib/routing"

import { CHECKOUT_STEPS } from "./checkout.constants"
import type { CheckoutStepSlug } from "./checkout.constants"

export const isCheckoutStepSlug = (value: string): value is CheckoutStepSlug =>
  CHECKOUT_STEPS.some((step) => step.slug === value)

export const resolveCheckoutStepHref = (step: CheckoutStepSlug) =>
  appHref(`/checkout/${step}`)

export const resolveCheckoutStepIndexBySlug = (step: CheckoutStepSlug) => {
  const index = CHECKOUT_STEPS.findIndex((item) => item.slug === step)
  return Math.max(index, 0)
}

export const resolveRequiredCheckoutStepSlug = (params: {
  hasItems: boolean
  hasPayment: boolean
  hasShipping: boolean
  hasStoredAddress: boolean
}): CheckoutStepSlug => {
  if (!params.hasItems) {
    return "kosik"
  }

  if (!(params.hasShipping && params.hasPayment)) {
    return "doprava-platba"
  }

  if (!params.hasStoredAddress) {
    return "udaje"
  }

  return "suhrn"
}

export const canAccessCheckoutStep = (params: {
  requestedStep: CheckoutStepSlug
  hasItems: boolean
  hasPayment: boolean
  hasShipping: boolean
  hasStoredAddress: boolean
}) => {
  switch (params.requestedStep) {
    case "kosik": {
      return true
    }
    case "doprava-platba": {
      return params.hasItems
    }
    case "udaje": {
      return params.hasItems && params.hasShipping && params.hasPayment
    }
    case "suhrn": {
      return (
        params.hasItems &&
        params.hasShipping &&
        params.hasPayment &&
        params.hasStoredAddress
      )
    }
    default: {
      return false
    }
  }
}
