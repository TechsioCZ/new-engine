import { checkoutFlow } from "./storefront-preset"

type CheckoutFlow = typeof checkoutFlow

type RawCompleteCheckoutInput = Parameters<
  CheckoutFlow["useCompleteCheckout"]
>[0]
type RawCompleteCheckoutOptions = Parameters<
  CheckoutFlow["useCompleteCheckout"]
>[1]
type CompleteCheckoutOnError = NonNullable<
  NonNullable<RawCompleteCheckoutOptions>["onError"]
>
type CompleteCheckoutOnSuccess = NonNullable<
  NonNullable<RawCompleteCheckoutOptions>["onSuccess"]
>

export type CompleteCheckoutError = Parameters<CompleteCheckoutOnError>[0]
export type CompleteCheckoutSuccess = Parameters<CompleteCheckoutOnSuccess>[0]
export type UseCompleteCheckoutInput = RawCompleteCheckoutInput
export type UseCompleteCheckoutOptions = NonNullable<RawCompleteCheckoutOptions>

export function useCompleteCheckout(
  input: UseCompleteCheckoutInput,
  options?: UseCompleteCheckoutOptions
) {
  return checkoutFlow.useCompleteCheckout(input, options)
}
