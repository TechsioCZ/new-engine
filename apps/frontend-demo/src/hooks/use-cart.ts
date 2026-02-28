"use client"

import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useState } from "react"
import { STORAGE_KEYS } from "@/lib/constants"
import { queryKeys } from "@/lib/query-keys"
import { useRegions } from "./use-region"
import {
  useStorefrontAddLineItem,
  useStorefrontCart,
  useStorefrontRemoveLineItem,
  useStorefrontUpdateCart,
  useStorefrontUpdateLineItem,
} from "./storefront-cart"

export type Cart = HttpTypes.StoreCart | undefined

type ErrorResponse = {
  status?: number
  message?: string
  response?: { status?: number; data?: { message?: string } }
}

const getErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined
  const err = error as ErrorResponse
  return err.message ?? err.response?.data?.message
}

const resolveAddQuantity = (quantity?: number) => {
  if (typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0) {
    return Math.max(1, Math.trunc(quantity))
  }
  return 1
}

// Cart hook using React Query
export function useCart() {
  const { selectedRegion } = useRegions()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const {
    cart: storefrontCart,
    isLoading,
    error,
  } = useStorefrontCart({
    region_id: selectedRegion?.id,
    enabled: !!selectedRegion,
  })

  const cart: Cart = storefrontCart ?? undefined

  // Add item mutation
  const addItemMutation = useStorefrontAddLineItem({
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        title: "Pridano do kosiku",
        description: "Polozka byla pridana do vaseho kosiku",
        type: "success",
      })
    },
    onError: (error) => {
      console.error("[Cart Hook] Add item error:", error)

      const errorMessage = getErrorMessage(error) || "Unknown error"

      if (errorMessage.toLowerCase().includes("inventory")) {
        toast.create({
          title: "Vyprodano",
          description: "Tato varianta produktu neni dostupna v pozadovanem mnozstvi.",
          type: "error",
        })
      } else if (
        errorMessage.toLowerCase().includes("cart") &&
        errorMessage.toLowerCase().includes("not found")
      ) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.CART_ID)
        }
        toast.create({
          title: "Kosik vyprsel",
          description: "Vas kosik vyprsel. Zkuste to prosim znovu.",
          type: "error",
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
      } else {
        toast.create({
          title: "Nepodarilo se pridat polozku",
          description: errorMessage,
          type: "error",
        })
      }
    },
  })

  const updateLineItemMutation = useStorefrontUpdateLineItem()
  const removeLineItemSilentMutation = useStorefrontRemoveLineItem()

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      lineItemId,
      quantity,
    }: {
      lineItemId: string
      quantity: number
    }) => {
      if (!cart?.id) {
        throw new Error("No cart available")
      }

      const cartId = cart.id

      if (quantity <= 0) {
        return removeLineItemSilentMutation.mutateAsync({
          cartId,
          lineItemId,
        })
      }

      return updateLineItemMutation.mutateAsync({
        cartId,
        lineItemId,
        quantity,
      })
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
    },
    onError: (error) => {
      toast.create({
        title: "Nepodarilo se aktualizovat mnozstvi",
        description: getErrorMessage(error) || "Unknown error",
        type: "error",
      })
    },
  })

  // Remove item mutation
  const removeItemMutation = useStorefrontRemoveLineItem({
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        title: "Odebrano z kosiku",
        description: "Polozka byla odebrana z vaseho kosiku",
        type: "success",
      })
    },
    onError: (error) => {
      toast.create({
        title: "Nepodarilo se odebrat polozku",
        description: getErrorMessage(error) || "Unknown error",
        type: "error",
      })
    },
  })

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (!cart) {
        throw new Error("No cart available")
      }

      let latestCart = cart

      for (const item of cart.items || []) {
        if (!item.id) {
          continue
        }

        latestCart = await removeLineItemSilentMutation.mutateAsync({
          cartId: cart.id,
          lineItemId: item.id,
        })
      }

      return latestCart
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        title: "Kosik vyprazdnen",
        description: "Vsechny polozky byly odebrany z vaseho kosiku",
        type: "success",
      })
    },
  })

  // Apply discount mutation
  const applyDiscountMutation = useStorefrontUpdateCart({
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        title: "Sleva aplikovana",
        description: "Vas slevovy kod byl aplikovan",
        type: "success",
      })
    },
    onError: (error) => {
      toast.create({
        title: "Neplatny slevovy kod",
        description: getErrorMessage(error) || "Unknown error",
        type: "error",
      })
    },
  })

  return {
    // Cart data
    cart,
    isLoading,
    error,

    // UI state
    isOpen,
    toggleCart: () => setIsOpen((prev) => !prev),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),

    // Actions
    addItem: (variantId: string, quantity?: number) =>
      addItemMutation.mutate({
        cartId: cart?.id,
        region_id: selectedRegion?.id,
        variantId,
        quantity: resolveAddQuantity(quantity),
        autoCreate: true,
      }),
    updateQuantity: (lineItemId: string, quantity: number) =>
      updateQuantityMutation.mutate({ lineItemId, quantity }),
    removeItem: (lineItemId: string) => {
      if (!cart?.id) {
        console.warn("[Cart Hook] Cannot remove item: no cart available")
        return
      }

      removeItemMutation.mutate({
        cartId: cart.id,
        lineItemId,
      })
    },
    clearCart: () => clearCartMutation.mutate(),
    applyDiscount: (code: string) => {
      if (!cart?.id) {
        toast.create({
          title: "Nelze aplikovat slevu",
          description: "Nejprve pridejte polozku do kosiku",
          type: "error",
        })
        return
      }

      applyDiscountMutation.mutate({
        cartId: cart.id,
        promo_codes: [code],
      })
    },
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
