import { CHECKOUT_STEPS, type CheckoutStepSlug } from "./checkout.constants"

const CHECKOUT_STEP_SLUGS = CHECKOUT_STEPS.map((step) => step.slug)

export const isCheckoutStepSlug = (value: string): value is CheckoutStepSlug =>
  CHECKOUT_STEP_SLUGS.includes(value as CheckoutStepSlug)

export const resolveCheckoutStepHref = (step: CheckoutStepSlug) =>
  `/checkout/${step}`

export const resolveCheckoutStepIndexBySlug = (step: CheckoutStepSlug) => {
  const index = CHECKOUT_STEPS.findIndex((item) => item.slug === step)
  return index >= 0 ? index : 0
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
    case "kosik":
      return true
    case "doprava-platba":
      return params.hasItems
    case "udaje":
      return params.hasItems && params.hasShipping && params.hasPayment
    case "suhrn":
      return (
        params.hasItems &&
        params.hasShipping &&
        params.hasPayment &&
        params.hasStoredAddress
      )
    default:
      return false
  }
}
