import type { HttpTypes } from "@medusajs/types"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

import { CACHE_TIMES, TAX_RATE } from "@/lib/constants"
import { CartServiceError } from "@/lib/errors"
import { queryKeys } from "@/lib/query-keys"
import {
  type Cart,
  getShippingOptions,
  type ShippingMethodData,
  setShippingMethod,
} from "@/services/cart-service"

import { useCartToast } from "./use-toast"

type CartMutationError = {
  message: string
  code?: string
}

type CartMutationContext = {
  previousCart: Cart | undefined
}

type SetShippingVariables = {
  optionId: string
  data?: ShippingMethodData | undefined
}

export type UseCheckoutShippingReturn = {
  shippingOptions?: HttpTypes.StoreCartShippingOption[]
  setShipping: (optionId: string, data?: ShippingMethodData) => void
  isSettingShipping: boolean
  canLoadShipping: boolean
  canSetShipping: boolean
  selectedShippingMethodId?: string | undefined
  /** Currently selected shipping option (derived from shippingOptions + selectedShippingMethodId) */
  selectedOption?: HttpTypes.StoreCartShippingOption | undefined
}

export function useCheckoutShipping(
  cartId?: string,
  cart?: Cart | null
): UseCheckoutShippingReturn {
  const queryClient = useQueryClient()
  const toast = useCartToast()

  const canLoadShipping = !!cartId && (cart?.items?.length ?? 0) > 0

  // Fetch shipping options for cart
  const { data: shippingOptions } = useSuspenseQuery({
    queryKey: queryKeys.cart.shippingOptions(cartId || "unknown"),
    queryFn: () => {
      if (!(canLoadShipping && cartId)) {
        return []
      }
      return getShippingOptions(cartId)
    },
    // Longer cache for shipping options - they don't change often
    staleTime: CACHE_TIMES.SHIPPING_OPTIONS_STALE,
    gcTime: CACHE_TIMES.SHIPPING_OPTIONS_GC,
    refetchOnWindowFocus: false,
  })

  // Set shipping method mutation
  const { mutate: mutateShipping, isPending: isSettingShipping } = useMutation<
    Cart,
    CartMutationError,
    SetShippingVariables,
    CartMutationContext
  >({
    mutationFn: ({ optionId, data }) => {
      if (!cartId) {
        throw new CartServiceError("Cart ID je povinné", "VALIDATION_ERROR")
      }
      return setShippingMethod(cartId, optionId, data)
    },
    onMutate: async ({ optionId }) => {
      // Cancel outgoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.active() })

      // Snapshot previous value for rollback
      const previousCart = queryClient.getQueryData<Cart>(
        queryKeys.cart.active()
      )

      // Optimistically update cart with new shipping method
      if (previousCart && shippingOptions) {
        const selectedOption = shippingOptions.find(
          (opt) => opt.id === optionId
        )

        if (selectedOption) {
          // Calculate amount with tax using centralized constant
          const amountWithTax = selectedOption.amount * (1 + TAX_RATE)

          const optimisticCart: Cart = {
            ...previousCart,
            shipping_methods: [
              {
                id: `optimistic_${Date.now()}`,
                cart_id: cartId || "",
                shipping_option_id: optionId,
                name: selectedOption.name,
                amount: selectedOption.amount,
                is_tax_inclusive: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            shipping_total: amountWithTax,
          }

          // Immediately update UI
          queryClient.setQueryData(queryKeys.cart.active(), optimisticCart)

          if (process.env["NODE_ENV"] === "development") {
            console.log("[useCheckoutShipping] Optimistic update applied")
          }
        }
      }

      return { previousCart }
    },
    onSuccess: (updatedCart) => {
      // Replace optimistic data with real server data
      queryClient.setQueryData(queryKeys.cart.active(), updatedCart)

      if (process.env["NODE_ENV"] === "development") {
        console.log("[useCheckoutShipping] Shipping method confirmed:", {
          methodId: updatedCart.shipping_methods?.[0]?.shipping_option_id,
          total: updatedCart.shipping_total,
        })
      }
    },
    onError: (error, _variables, context) => {
      // Rollback to previous cart state
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.active(), context.previousCart)
      }

      // Show error toast to user
      toast.shippingError()

      if (process.env["NODE_ENV"] === "development") {
        console.error("[useCheckoutShipping] Failed to set shipping:", error)
      }
    },
    onSettled: () => {
      // No invalidations needed - we have fresh data from onSuccess
      // Shipping options don't change when selecting a method
    },
  })

  const canSetShipping = shippingOptions.length > 0
  const selectedShippingMethodId =
    cart?.shipping_methods?.[0]?.shipping_option_id

  // Derive selected option from shippingOptions + selectedShippingMethodId
  const selectedOption = shippingOptions?.find(
    (opt) => opt.id === selectedShippingMethodId
  )

  // Wrapper for easier API - accepts optionId and optional data
  const setShipping = (optionId: string, data?: ShippingMethodData) => {
    mutateShipping({ optionId, ...(data ? { data } : {}) })
  }

  return {
    shippingOptions,
    setShipping,
    isSettingShipping,
    canLoadShipping,
    canSetShipping,
    selectedShippingMethodId,
    selectedOption,
  }
}
