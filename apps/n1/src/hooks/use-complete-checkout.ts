import type {
  MedusaCompleteCheckoutError as CompleteCheckoutError,
  MedusaCompleteCheckoutSuccess as CompleteCheckoutSuccess,
  UseMedusaCompleteCheckoutInput as UseCompleteCheckoutInput,
  UseMedusaCompleteCheckoutOptions as UseCompleteCheckoutOptions,
} from "@techsio/storefront-data/medusa/checkout-flow"
import { checkoutFlow } from "./storefront-preset"

export type {
  CompleteCheckoutError,
  CompleteCheckoutSuccess,
  UseCompleteCheckoutInput,
  UseCompleteCheckoutOptions,
}

export function useCompleteCheckout(
  input: UseCompleteCheckoutInput,
  options?: UseCompleteCheckoutOptions
) {
  return checkoutFlow.useCompleteCheckout(input, options)
}
