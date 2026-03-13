import type {
  UseMedusaCartMutationOptions,
  UseMedusaCartReturn,
  UseMedusaCompleteCartOptions,
  UseMedusaSuspenseCartReturn,
} from "@techsio/storefront-data/medusa/cart-flow"
import { cartFlow } from "./storefront-preset"

export type {
  MedusaCartMutationError as CartMutationError,
  UseMedusaCartMutationOptions as UseCartMutationOptions,
  UseMedusaCartReturn as UseCartReturn,
  UseMedusaCompleteCartOptions as UseCompleteCartOptions,
  UseMedusaSuspenseCartReturn as UseSuspenseCartReturn,
} from "@techsio/storefront-data/medusa/cart-flow"

type UseAddToCartOptions = UseMedusaCartMutationOptions

export function useCart(): UseMedusaCartReturn {
  return cartFlow.useCart()
}

export function useSuspenseCart(): UseMedusaSuspenseCartReturn {
  return cartFlow.useSuspenseCart()
}

export function useAddToCart(options?: UseAddToCartOptions) {
  return cartFlow.useAddToCart(options)
}

export function useUpdateLineItem(options?: UseMedusaCartMutationOptions) {
  return cartFlow.useUpdateLineItem(options)
}

export function useRemoveLineItem(options?: UseMedusaCartMutationOptions) {
  return cartFlow.useRemoveLineItem(options)
}

export function useCompleteCart(options?: UseMedusaCompleteCartOptions) {
  return cartFlow.useCompleteCart(options)
}
