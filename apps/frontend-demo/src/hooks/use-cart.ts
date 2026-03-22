"use client"

import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useState } from "react"
import { useRegions } from "@/hooks/use-region"
import { cacheConfig } from "@/lib/cache-config"
import { STORAGE_KEYS } from "@/lib/constants"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"

export type Cart = HttpTypes.StoreCart | undefined

type ErrorResponse = {
  status?: number
  message?: string
  response?: { status?: number; data?: { message?: string } }
}

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined
  const err = error as ErrorResponse
  return err.status ?? err.response?.status
}

const getErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined
  const err = error as ErrorResponse
  return err.message ?? err.response?.data?.message
}

// Cart hook using React Query
export function useCart() {
  const { selectedRegion } = useRegions()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)

  // Get or create cart
  const {
    data: cart,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.cart(
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEYS.CART_ID) || undefined
        : undefined
    ),
    queryFn: async () => {
      const cartId =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEYS.CART_ID)
          : null

      if (cartId) {
        try {
          const { cart } = await sdk.store.cart.retrieve(cartId)

          // If cart region doesn't match current region, update it instead of creating new
          if (selectedRegion && cart.region_id !== selectedRegion.id) {
            const { cart: updatedCart } = await sdk.store.cart.update(cart.id, {
              region_id: selectedRegion.id,
            })
            return updatedCart
          }

          return cart
        } catch (err) {
          console.error("[Cart Hook] Failed to retrieve cart:", err)
          // Only remove cart ID if it's a 404 (cart not found)
          if (getErrorStatus(err) === 404) {
            if (typeof window !== "undefined") {
              localStorage.removeItem(STORAGE_KEYS.CART_ID)
            }
          } else {
            // For other errors, don't remove cart ID - might be network issue
            throw err
          }
        }
      }

      // Create new cart
      if (!selectedRegion) {
        throw new Error("No region available")
      }

      const { cart: newCart } = await sdk.store.cart.create({
        region_id: selectedRegion.id,
      })

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.CART_ID, newCart.id)
      }
      return newCart
    },
    enabled: !!selectedRegion,
    ...cacheConfig.realtime, // 30s stale, 5m gc, refetch on focus
    retry: (failureCount, error) => {
      // Don't retry if cart was not found
      if (getErrorStatus(error) === 404) return false
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
  })

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async ({
      variantId,
      quantity = 1,
    }: {
      variantId: string
      quantity?: number
    }) => {
      if (!cart) throw new Error("No cart available")

      const { cart: updatedCart } = await sdk.store.cart.createLineItem(
        cart.id,
        {
          variant_id: variantId,
          quantity,
        }
      )
      return updatedCart
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        title: "Přidáno do košíku",
        description: "Položka byla přidána do vašeho košíku",
        type: "success",
      })
    },
    onError: (error) => {
      console.error("[Cart Hook] Add item error:", error)

      // Parse error message for specific inventory issue
      const errorMessage = getErrorMessage(error) || "Unknown error"

      if (errorMessage.toLowerCase().includes("inventory")) {
        toast.create({
          title: "Vyprodáno",
          description:
            "Tato varianta produktu není dostupná v požadovaném množství.",
          type: "error",
        })
      } else if (
        errorMessage.toLowerCase().includes("cart") &&
        errorMessage.toLowerCase().includes("not found")
      ) {
        // Cart was likely deleted or expired, clear localStorage and retry
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.CART_ID)
        }
        toast.create({
          title: "Košík vypršel",
          description: "Váš košík vypršel. Zkuste to prosím znovu.",
          type: "error",
        })
        // Invalidate cart query to trigger recreation
        queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
      } else {
        toast.create({
          title: "Nepodařilo se přidat položku",
          description: errorMessage,
          type: "error",
        })
      }
    },
  })

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      lineItemId,
      quantity,
    }: {
      lineItemId: string
      quantity: number
    }) => {
      if (!cart) throw new Error("No cart available")

      if (quantity <= 0) {
        await sdk.store.cart.deleteLineItem(cart.id, lineItemId)
        const { cart: updatedCart } = await sdk.store.cart.retrieve(cart.id)
        return updatedCart
      }

      const { cart: updatedCart } = await sdk.store.cart.updateLineItem(
        cart.id,
        lineItemId,
        { quantity }
      )
      return updatedCart
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
    },
    onError: (error: Error) => {
      toast.create({
        title: "Nepodařilo se aktualizovat množství",
        description: error.message,
        type: "error",
      })
    },
  })

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (lineItemId: string) => {
      if (!cart) throw new Error("No cart available")

      await sdk.store.cart.deleteLineItem(cart.id, lineItemId)
      const { cart: updatedCart } = await sdk.store.cart.retrieve(cart.id)
      return updatedCart
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        title: "Odebráno z košíku",
        description: "Položka byla odebrána z vašeho košíku",
        type: "success",
      })
    },
    onError: (error: Error) => {
      toast.create({
        title: "Nepodařilo se odebrat položku",
        description: error.message,
        type: "error",
      })
    },
  })

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (!cart) throw new Error("No cart available")

      // Remove all items
      for (const item of cart.items || []) {
        await sdk.store.cart.deleteLineItem(cart.id, item.id)
      }

      const { cart: updatedCart } = await sdk.store.cart.retrieve(cart.id)
      return updatedCart
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        title: "Košík vyprázdněn",
        description: "Všechny položky byly odebrány z vašeho košíku",
        type: "success",
      })
    },
  })

  // Apply discount mutation
  const applyDiscountMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!cart) throw new Error("No cart available")
      const { cart: updatedCart } = await sdk.store.cart.update(cart.id, {
        promo_codes: [code],
      })
      return updatedCart
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        title: "Sleva aplikována",
        description: "Váš slevový kód byl aplikován",
        type: "success",
      })
    },
    onError: (error: Error) => {
      toast.create({
        title: "Neplatný slevový kód",
        description: error.message,
        type: "error",
      })
    },
  })

  return {
    // Cart data
    cart,
    isLoading,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,

    // UI state
    isOpen,
    toggleCart: () => setIsOpen((prev) => !prev),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),

    // Actions
    addItem: (variantId: string, quantity?: number) =>
      addItemMutation.mutate({ variantId, quantity }),
    updateQuantity: (lineItemId: string, quantity: number) =>
      updateQuantityMutation.mutate({ lineItemId, quantity }),
    removeItem: (lineItemId: string) => removeItemMutation.mutate(lineItemId),
    clearCart: () => clearCartMutation.mutate(),
    applyDiscount: (code: string) => applyDiscountMutation.mutate(code),
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.cart(cart?.id) }),

    // Mutations for direct access
    addItemMutation,
    updateQuantityMutation,
    removeItemMutation,
    clearCartMutation,
    applyDiscountMutation,

    // Computed values
    itemCount: cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    subtotal: cart?.subtotal || 0,
    tax: cart?.tax_total || 0,
    shipping: cart?.shipping_total || 0,
    discount: cart?.discount_total || 0,
    total: cart?.total || 0,
    items: cart?.items || [],
  }
}
