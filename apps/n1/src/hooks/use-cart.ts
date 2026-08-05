import type { HttpTypes } from "@medusajs/types"
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import {
  addToCart,
  completeCart,
  createCart,
  getCart,
  removeLineItem,
  updateLineItem,
} from "@/services/cart-service"
import type {
  Cart,
  CompleteCartResult,
  OptimisticCart,
  OptimisticLineItem,
} from "@/services/cart-service"

import { useRegion } from "./use-region"

interface CartMutationError {
  message: string
  code?: string
}

interface CartMutationContext {
  previousCart: Cart | undefined
}

interface UseCartReturn {
  cart: Cart | null | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

interface UseSuspenseCartReturn {
  cart: Cart | null | undefined
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

interface UseAddToCartOptions {
  onSuccess?: (cart: Cart) => void
  onError?: (error: CartMutationError) => void
}

export function useCart(): UseCartReturn {
  const {
    data: cart,
    isLoading,
    isError,
    error,
  } = useQuery({
    enabled: true, // Always enabled for guest and authenticated users
    queryFn: getCart,
    queryKey: queryKeys.cart.active(),
    retry: (failureCount, retryError) => {
      if (
        retryError instanceof Error &&
        retryError.message?.includes("not found")
      ) {
        return false
      }
      // Retry network errors up to 3 times
      if (error instanceof Error && error.message?.includes("Network")) {
        return failureCount < 3
      }
      return failureCount < 1
    },
    ...cacheConfig.realtime,
  })

  const itemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
  const isEmpty = itemCount === 0
  const hasItems = itemCount > 0

  return {
    cart,
    error: error,
    hasItems,
    isEmpty,
    isError,
    isLoading,
    itemCount,
  }
}

export function useSuspenseCart(): UseSuspenseCartReturn {
  const { data: cart } = useSuspenseQuery({
    queryFn: getCart,
    queryKey: queryKeys.cart.active(),
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message?.includes("not found")) {
        return false
      }
      if (error instanceof Error && error.message?.includes("Network")) {
        return failureCount < 3
      }
      return failureCount < 1
    },
    ...cacheConfig.realtime,
  })

  const itemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
  const isEmpty = itemCount === 0
  const hasItems = itemCount > 0

  return {
    cart,
    hasItems,
    isEmpty,
    itemCount,
  }
}

export function useAddToCart(options?: UseAddToCartOptions) {
  const queryClient = useQueryClient()
  const { regionId } = useRegion()

  return useMutation<
    Cart,
    CartMutationError,
    {
      variantId: string
      quantity?: number
      autoCreateCart?: boolean
      metadata?: Record<string, unknown>
    },
    CartMutationContext
  >({
    mutationFn: async ({
      variantId,
      quantity = 1,
      autoCreateCart = true,
      metadata,
    }) => {
      // Get current cart or create new one
      let cart = queryClient.getQueryData<Cart>(queryKeys.cart.active())

      if (!cart && autoCreateCart && regionId) {
        // Create cart synchronously if needed
        cart = await createCart(regionId)
        queryClient.setQueryData(queryKeys.cart.active(), cart)
      }

      if (!cart) {
        throw new Error("No cart available")
      }

      return await addToCart(cart.id, variantId, quantity, metadata)
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.active(), context.previousCart)
      }

      if (process.env.NODE_ENV === "development") {
        console.error("[useAddToCart] Failed to add item:", error)
      }

      options?.onError?.(error)
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.active() })

      // Snapshot the previous cart
      const previousCart = queryClient.getQueryData<Cart>(
        queryKeys.cart.active()
      )

      // Optimistic update - add loading state indicator
      if (previousCart) {
        const optimisticCart: OptimisticCart = {
          ...previousCart,
          _optimistic: true,
        }
        queryClient.setQueryData(queryKeys.cart.active(), optimisticCart)
      }

      return { previousCart }
    },
    onSettled: async () => {
      // Always refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.active() })
    },
    onSuccess: (cart, _variables) => {
      // Update with real cart from server
      queryClient.setQueryData(queryKeys.cart.active(), cart)

      if (process.env.NODE_ENV === "development") {
        console.log("[useAddToCart] Item added successfully")
      }

      options?.onSuccess?.(cart)
    },
  })
}

export function useUpdateLineItem() {
  const queryClient = useQueryClient()

  return useMutation<
    Cart,
    CartMutationError,
    {
      cartId: string
      lineItemId: string
      quantity: number
    },
    CartMutationContext
  >({
    mutationFn: async ({ cartId, lineItemId, quantity }) =>
      updateLineItem(cartId, lineItemId, quantity),
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.active(), context.previousCart)
      }
      if (process.env.NODE_ENV === "development") {
        console.error("[useUpdateLineItem] Failed to update quantity:", error)
      }
    },
    onMutate: async ({ lineItemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.active() })

      const previousCart = queryClient.getQueryData<Cart>(
        queryKeys.cart.active()
      )

      // Optimistic update with validation
      if (previousCart?.items) {
        const updatedCart: OptimisticCart = {
          ...previousCart,
          items: previousCart.items.map((item): OptimisticLineItem =>
            item.id === lineItemId
              ? { ...item, quantity, _optimistic: true }
              : item
          ),
          _optimistic: true,
        }

        queryClient.setQueryData(queryKeys.cart.active(), updatedCart)
      }

      return { previousCart }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.active() })
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.active(), cart)

      if (process.env.NODE_ENV === "development") {
        console.log("[useUpdateLineItem] Quantity updated successfully")
      }
    },
  })
}

export function useRemoveLineItem() {
  const queryClient = useQueryClient()

  return useMutation<
    Cart,
    CartMutationError,
    {
      cartId: string
      lineItemId: string
    },
    CartMutationContext
  >({
    mutationFn: async ({ cartId, lineItemId }) =>
      removeLineItem(cartId, lineItemId),
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.active(), context.previousCart)
      }
      if (process.env.NODE_ENV === "development") {
        console.error("[useRemoveLineItem] Failed to remove item:", error)
      }
    },
    onMutate: async ({ lineItemId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.active() })

      const previousCart = queryClient.getQueryData<Cart>(
        queryKeys.cart.active()
      )

      // Optimistic removal
      if (previousCart?.items) {
        const updatedCart: OptimisticCart = {
          ...previousCart,
          items: previousCart.items.filter((item) => item.id !== lineItemId),
          _optimistic: true,
        }

        queryClient.setQueryData(queryKeys.cart.active(), updatedCart)
      }

      return { previousCart }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.active() })
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.active(), cart)

      if (process.env.NODE_ENV === "development") {
        console.log("[useRemoveLineItem] Item removed successfully")
      }
    },
  })
}

interface UseCompleteCartOptions {
  onSuccess?: (order: HttpTypes.StoreOrder) => void
  onError?: (
    error: { message: string; type: string; name?: string },
    cart: Cart
  ) => void
}

export function useCompleteCart(options?: UseCompleteCartOptions) {
  const queryClient = useQueryClient()

  return useMutation<
    CompleteCartResult,
    CartMutationError,
    { cartId: string },
    CartMutationContext
  >({
    mutationFn: async ({ cartId }) => completeCart(cartId),
    onError: (error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[useCompleteCart] Failed to complete cart:", error)
      }
    },
    onSuccess: async (result) => {
      if (result.success) {
        const order = result.order

        // Clear cart cache
        queryClient.setQueryData(queryKeys.cart.active(), null)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.cart.active(),
        })

        queryClient.setQueryData(queryKeys.orders.detail(order.id), order)

        await queryClient.invalidateQueries({
          queryKey: queryKeys.orders.all(),
        })

        if (process.env.NODE_ENV === "development") {
          console.log("[useCompleteCart] Order created successfully:", order.id)
        }

        options?.onSuccess?.(order)
      } else {
        // FAILURE PATH: Validation or payment error
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[useCompleteCart] Cart completion failed:",
            result.error
          )
        }

        // Update cart cache with the returned cart (might have changes)
        queryClient.setQueryData(queryKeys.cart.active(), result.cart)

        options?.onError?.(result.error, result.cart)
      }
    },
  })
}
