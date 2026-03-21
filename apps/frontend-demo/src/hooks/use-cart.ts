"use client"

import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useState } from "react"
import { storefront, storefrontFlows } from "@/lib/storefront"

export type Cart = HttpTypes.StoreCart | null

type ErrorResponse = {
  status?: number
  message?: string
  response?: { status?: number; data?: { message?: string } }
}

const getErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") {
    return
  }
  const err = error as ErrorResponse
  return err.message ?? err.response?.data?.message
}

export function useCart() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const cartQuery = storefront.hooks.cart.useCart({})
  const addItemMutation = storefrontFlows.cart.useAddToCart({
    onSuccess: () => {
      toast.create({
        title: "Přidáno do košíku",
        description: "Položka byla přidána do vašeho košíku",
        type: "success",
      })
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error) ?? error.message

      if (errorMessage.toLowerCase().includes("inventory")) {
        toast.create({
          title: "Vyprodáno",
          description:
            "Tato varianta produktu není dostupná v požadovaném množství.",
          type: "error",
        })
        return
      }

      toast.create({
        title: "Nepodařilo se přidat položku",
        description: errorMessage,
        type: "error",
      })
    },
  })
  const updateQuantityMutation = storefrontFlows.cart.useUpdateLineItem({
    onError: (error) => {
      toast.create({
        title: "Nepodařilo se aktualizovat množství",
        description: error.message,
        type: "error",
      })
    },
  })
  const removeItemMutation = storefrontFlows.cart.useRemoveLineItem({
    onSuccess: () => {
      toast.create({
        title: "Odebráno z košíku",
        description: "Položka byla odebrána z vašeho košíku",
        type: "success",
      })
    },
    onError: (error) => {
      toast.create({
        title: "Nepodařilo se odebrat položku",
        description: error.message,
        type: "error",
      })
    },
  })
  const removeItemSilentlyMutation = storefrontFlows.cart.useRemoveLineItem()

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const items = cartQuery.cart?.items ?? []

      for (const item of items) {
        await removeItemSilentlyMutation.mutateAsync({
          lineItemId: item.id,
        })
      }

      return null
    },
    onSuccess: () => {
      toast.create({
        title: "Košík vyprázdněn",
        description: "Všechny položky byly odebrány z vašeho košíku",
        type: "success",
      })
    },
  })

  return {
    cart: cartQuery.cart,
    isLoading: cartQuery.isLoading,
    error: cartQuery.error,
    isOpen,
    toggleCart: () => setIsOpen((prev) => !prev),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem: (variantId: string, quantity?: number) =>
      addItemMutation.mutate({
        variantId,
        quantity,
      }),
    updateQuantity: (lineItemId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItemMutation.mutate({ lineItemId })
        return
      }

      updateQuantityMutation.mutate({
        lineItemId,
        quantity,
      })
    },
    removeItem: (lineItemId: string) =>
      removeItemMutation.mutate({ lineItemId }),
    clearCart: () => clearCartMutation.mutate(),
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: storefront.queryKeys.cart.all(),
      }),
    addItemMutation,
    updateQuantityMutation,
    removeItemMutation,
    clearCartMutation,
    itemCount: cartQuery.itemCount,
    subtotal: cartQuery.cart?.subtotal || 0,
    tax: cartQuery.cart?.tax_total || 0,
    shipping: cartQuery.cart?.shipping_total || 0,
    discount: cartQuery.cart?.discount_total || 0,
    total: cartQuery.cart?.total || 0,
    items: cartQuery.cart?.items || [],
  }
}
