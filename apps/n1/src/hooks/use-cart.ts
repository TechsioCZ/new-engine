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
  type Cart,
  type CompleteCartResult,
  completeCart,
  createCart,
  getCart,
  type OptimisticCart,
  type OptimisticLineItem,
  removeLineItem,
  updateLineItem,
} from "@/services/cart-service"

import { useRegion } from "./use-region"

type CartMutationError = {
  message: string
  code?: string
}

type CartMutationContext = {
  previousCart: Cart | undefined
}

type UseCartReturn = {
  cart: Cart | null | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

type UseSuspenseCartReturn = {
  cart: Cart | null | undefined
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

type UseAddToCartOptions = {
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
    queryKey: queryKeys.cart.active(),
    queryFn: getCart,
    enabled: true, // Always enabled for guest and authenticated users
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
    isLoading,
    isError,
    error: error as Error | null,
    itemCount,
    isEmpty,
    hasItems,
  }
}

export function useSuspenseCart(): UseSuspenseCartReturn {
  const { data: cart } = useSuspenseQuery({
    queryKey: queryKeys.cart.active(),
    queryFn: getCart,
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
    itemCount,
    isEmpty,
    hasItems,
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

      return addToCart(cart.id, variantId, quantity, metadata)
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
    onSuccess: (cart, _variables) => {
      // Update with real cart from server
      queryClient.setQueryData(queryKeys.cart.active(), cart)

      if (process.env["NODE_ENV"] === "development") {
        console.log("[useAddToCart] Item added successfully")
      }

      options?.onSuccess?.(cart)
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.active(), context.previousCart)
      }

      if (process.env["NODE_ENV"] === "development") {
        console.error("[useAddToCart] Failed to add item:", error)
      }

      options?.onError?.(error)
    },
    onSettled: async () => {
      // Always refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.active() })
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
    mutationFn: ({ cartId, lineItemId, quantity }) =>
      updateLineItem(cartId, lineItemId, quantity),
    onMutate: async ({ lineItemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.active() })

      const previousCart = queryClient.getQueryData<Cart>(
        queryKeys.cart.active()
      )

      // Optimistic update with validation
      if (previousCart?.items) {
        const updatedCart: OptimisticCart = {
          ...previousCart,
          items: previousCart.items.map(
            (item): OptimisticLineItem =>
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
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.active(), cart)

      if (process.env["NODE_ENV"] === "development") {
        console.log("[useUpdateLineItem] Quantity updated successfully")
      }
    },
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.active(), context.previousCart)
      }
      if (process.env["NODE_ENV"] === "development") {
        console.error("[useUpdateLineItem] Failed to update quantity:", error)
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.active() })
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
    mutationFn: ({ cartId, lineItemId }) => removeLineItem(cartId, lineItemId),
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
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart.active(), cart)

      if (process.env["NODE_ENV"] === "development") {
        console.log("[useRemoveLineItem] Item removed successfully")
      }
    },
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.active(), context.previousCart)
      }
      if (process.env["NODE_ENV"] === "development") {
        console.error("[useRemoveLineItem] Failed to remove item:", error)
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.active() })
    },
  })
}

type UseCompleteCartOptions = {
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
    mutationFn: ({ cartId }) => completeCart(cartId),
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

        if (process.env["NODE_ENV"] === "development") {
          console.log("[useCompleteCart] Order created successfully:", order.id)
        }

        options?.onSuccess?.(order)
      } else {
        // FAILURE PATH: Validation or payment error
        if (process.env["NODE_ENV"] === "development") {
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
    onError: (error) => {
      if (process.env["NODE_ENV"] === "development") {
        console.error("[useCompleteCart] Failed to complete cart:", error)
      }
    },
  })
}
