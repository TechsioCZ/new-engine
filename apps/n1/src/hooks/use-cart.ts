import { cartFlow } from "./storefront-preset"

type CartFlow = typeof cartFlow

type RawCartMutationOptions = Parameters<CartFlow["useAddToCart"]>[0]
type RawCompleteCartOptions = Parameters<CartFlow["useCompleteCart"]>[0]
type CartMutationOnError = NonNullable<
  NonNullable<RawCartMutationOptions>["onError"]
>

type UseAddToCartResult = ReturnType<CartFlow["useAddToCart"]>
type UseUpdateLineItemResult = ReturnType<CartFlow["useUpdateLineItem"]>
type UseRemoveLineItemResult = ReturnType<CartFlow["useRemoveLineItem"]>
type UseCompleteCartResult = ReturnType<CartFlow["useCompleteCart"]>

export type CartMutationError = Parameters<CartMutationOnError>[0]
export type UseCartReturn = ReturnType<CartFlow["useCart"]>
export type UseSuspenseCartReturn = ReturnType<CartFlow["useSuspenseCart"]>
export type UseCartMutationOptions = NonNullable<RawCartMutationOptions>
export type UseCompleteCartOptions = NonNullable<RawCompleteCartOptions>

type UseAddToCartOptions = UseCartMutationOptions

export function useCart(): UseCartReturn {
  return cartFlow.useCart()
}

export function useSuspenseCart(): UseSuspenseCartReturn {
  return cartFlow.useSuspenseCart()
}

export function useAddToCart(
  options?: UseAddToCartOptions
): UseAddToCartResult {
  return cartFlow.useAddToCart(options)
}

export function useUpdateLineItem(
  options?: UseCartMutationOptions
): UseUpdateLineItemResult {
  return cartFlow.useUpdateLineItem(options)
}

export function useRemoveLineItem(
  options?: UseCartMutationOptions
): UseRemoveLineItemResult {
  return cartFlow.useRemoveLineItem(options)
}

export function useCompleteCart(
  options?: UseCompleteCartOptions
): UseCompleteCartResult {
  return cartFlow.useCompleteCart(options)
}
