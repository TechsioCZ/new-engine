"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { useRegions } from "@/hooks/use-region"
import { STORAGE_KEYS } from "@/lib/constants"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"

export function CartPrefetch() {
  const queryClient = useQueryClient()
  const { selectedRegion } = useRegions()

  useEffect(() => {
    if (!selectedRegion) {
      return
    }

    // Prefetch cart data
    void queryClient.prefetchQuery({
      gcTime: 10 * 60 * 1000, // 10 minutes
      queryFn: async () => {
        const cartId =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEYS.CART_ID)
            : null

        if (cartId) {
          try {
            const { cart } = await sdk.store.cart.retrieve(cartId)
            return cart
          } catch (err) {
            // Cart not found, will create new one below
            console.error("[Cart Prefetch] Failed to retrieve cart:", err)
            localStorage.removeItem(STORAGE_KEYS.CART_ID)
          }
        }

        // Create new cart
        const { cart: newCart } = await sdk.store.cart.create({
          region_id: selectedRegion.id,
        })

        localStorage.setItem(STORAGE_KEYS.CART_ID, newCart.id)
        return newCart
      },
      queryKey: queryKeys.cart(
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEYS.CART_ID) || undefined
          : undefined
      ),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }, [queryClient, selectedRegion])

  return null
}
