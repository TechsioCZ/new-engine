import type {
  MedusaCartMutationError as CartMutationError,
  UseMedusaCartMutationOptions as UseCartMutationOptions,
  UseMedusaCartReturn as UseCartReturn,
  UseMedusaCompleteCartOptions as UseCompleteCartOptions,
  UseMedusaSuspenseCartReturn as UseSuspenseCartReturn,
} from "@techsio/storefront-data/medusa/cart-flow"
import { cartFlow } from "./storefront-preset"

type UseAddToCartOptions = UseCartMutationOptions

export type {
  CartMutationError,
  UseCartMutationOptions,
  UseCartReturn,
  UseCompleteCartOptions,
  UseSuspenseCartReturn,
}

export function useCart(): UseCartReturn {
  return cartFlow.useCart()
}

export function useSuspenseCart(): UseSuspenseCartReturn {
  return cartFlow.useSuspenseCart()
}

export function useAddToCart(options?: UseAddToCartOptions) {
  return cartFlow.useAddToCart(options)
}

export function useUpdateLineItem(options?: UseCartMutationOptions) {
  return cartFlow.useUpdateLineItem(options)
}

export function useRemoveLineItem(options?: UseCartMutationOptions) {
  return cartFlow.useRemoveLineItem(options)
}

export function useCompleteCart(options?: UseCompleteCartOptions) {
  return cartFlow.useCompleteCart(options)
}
