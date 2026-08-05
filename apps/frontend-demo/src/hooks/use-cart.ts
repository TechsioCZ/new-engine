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

const NO_CART_ERROR_MESSAGE = "No cart available"
const UNKNOWN_ERROR_MESSAGE = "Unknown error"

const readErrorStatus = (value: unknown): number | undefined => {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return undefined
  }

  return typeof value.status === "number" ? value.status : undefined
}

const getErrorStatus = (error: unknown): number | undefined => {
  const directStatus = readErrorStatus(error)
  if (directStatus !== undefined) {
    return directStatus
  }
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined
  }

  return readErrorStatus(error.response)
}

const readErrorMessage = (value: unknown): string | undefined => {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return undefined
  }

  return typeof value.message === "string" ? value.message : undefined
}

const readResponseData = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null || !("data" in value)) {
    return undefined
  }

  return value.data
}

const readErrorResponse = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null || !("response" in value)) {
    return undefined
  }

  return value.response
}

const resolveErrorMessage = (error: unknown): string | undefined => {
  const directMessage = readErrorMessage(error)
  if (directMessage !== undefined) {
    return directMessage
  }

  return readErrorMessage(readResponseData(readErrorResponse(error)))
}

const useCart = () => {
  const { selectedRegion } = useRegions()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const {
    data: cart,
    error: cartQueryError,
    isLoading,
  } = useQuery({
    ...cacheConfig.realtime,
    enabled: selectedRegion !== null,
    queryFn: async () => {
      const cartId =
        typeof window === "undefined"
          ? null
          : localStorage.getItem(STORAGE_KEYS.CART_ID)

      if (cartId !== null && cartId.length > 0) {
        try {
          const { cart: retrievedCart } = await sdk.store.cart.retrieve(cartId)

          if (
            selectedRegion !== null &&
            retrievedCart.region_id !== selectedRegion.id
          ) {
            const { cart: updatedCart } = await sdk.store.cart.update(
              retrievedCart.id,
              {
                region_id: selectedRegion.id,
              },
            )
            return updatedCart
          }

          return retrievedCart
        } catch (caughtError) {
          console.error("[Cart Hook] Failed to retrieve cart:", caughtError)
          if (getErrorStatus(caughtError) === 404) {
            if (typeof window !== "undefined") {
              localStorage.removeItem(STORAGE_KEYS.CART_ID)
            }
          } else {
            throw caughtError
          }
        }
      }

      if (selectedRegion === null) {
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
    queryKey: queryKeys.cart(
      typeof window === "undefined"
        ? undefined
        : (localStorage.getItem(STORAGE_KEYS.CART_ID) ?? undefined),
    ),
    retry: (failureCount, retryError) => {
      if (getErrorStatus(retryError) === 404) {
        return false
      }
      return failureCount < 3
    },
  })

  const addItemMutation = useMutation({
    mutationFn: async ({
      variantId,
      quantity = 1,
    }: {
      variantId: string
      quantity?: number
    }) => {
      if (cart === undefined) {
        throw new Error(NO_CART_ERROR_MESSAGE)
      }

      const { cart: updatedCart } = await sdk.store.cart.createLineItem(
        cart.id,
        {
          quantity,
          variant_id: variantId,
        },
      )
      return updatedCart
    },
    onError: async (mutationError) => {
      console.error("[Cart Hook] Add item error:", mutationError)

      const errorMessage =
        resolveErrorMessage(mutationError) ?? UNKNOWN_ERROR_MESSAGE
      const normalizedErrorMessage = errorMessage.toLowerCase()

      if (normalizedErrorMessage.includes("inventory")) {
        toast.create({
          description:
            "Tato varianta produktu není dostupná v požadovaném množství.",
          title: "Vyprodáno",
          type: "error",
        })
      } else if (
        normalizedErrorMessage.includes("cart") &&
        normalizedErrorMessage.includes("not found")
      ) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.CART_ID)
        }
        toast.create({
          description: "Váš košík vypršel. Zkuste to prosím znovu.",
          title: "Košík vypršel",
          type: "error",
        })
        await queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
      } else {
        toast.create({
          description: errorMessage,
          title: "Nepodařilo se přidat položku",
          type: "error",
        })
      }
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        description: "Položka byla přidána do vašeho košíku",
        title: "Přidáno do košíku",
        type: "success",
      })
    },
  })

  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      lineItemId,
      quantity,
    }: {
      lineItemId: string
      quantity: number
    }) => {
      if (cart === undefined) {
        throw new Error(NO_CART_ERROR_MESSAGE)
      }

      if (quantity <= 0) {
        await sdk.store.cart.deleteLineItem(cart.id, lineItemId)
        const { cart: updatedCart } = await sdk.store.cart.retrieve(cart.id)
        return updatedCart
      }

      const { cart: updatedCart } = await sdk.store.cart.updateLineItem(
        cart.id,
        lineItemId,
        { quantity },
      )
      return updatedCart
    },
    onError: (mutationError) => {
      toast.create({
        description:
          resolveErrorMessage(mutationError) ?? UNKNOWN_ERROR_MESSAGE,
        title: "Nepodařilo se aktualizovat množství",
        type: "error",
      })
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: async (lineItemId: string) => {
      if (cart === undefined) {
        throw new Error(NO_CART_ERROR_MESSAGE)
      }

      await sdk.store.cart.deleteLineItem(cart.id, lineItemId)
      const { cart: updatedCart } = await sdk.store.cart.retrieve(cart.id)
      return updatedCart
    },
    onError: (mutationError) => {
      toast.create({
        description:
          resolveErrorMessage(mutationError) ?? UNKNOWN_ERROR_MESSAGE,
        title: "Nepodařilo se odebrat položku",
        type: "error",
      })
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        description: "Položka byla odebrána z vašeho košíku",
        title: "Odebráno z košíku",
        type: "success",
      })
    },
  })

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (cart === undefined) {
        throw new Error(NO_CART_ERROR_MESSAGE)
      }

      await Promise.all(
        (cart.items ?? []).map(
          async (item) => await sdk.store.cart.deleteLineItem(cart.id, item.id),
        ),
      )

      const { cart: updatedCart } = await sdk.store.cart.retrieve(cart.id)
      return updatedCart
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        description: "Všechny položky byly odebrány z vašeho košíku",
        title: "Košík vyprázdněn",
        type: "success",
      })
    },
  })

  const applyDiscountMutation = useMutation({
    mutationFn: async (code: string) => {
      if (cart === undefined) {
        throw new Error(NO_CART_ERROR_MESSAGE)
      }
      const { cart: updatedCart } = await sdk.store.cart.update(cart.id, {
        promo_codes: [code],
      })
      return updatedCart
    },
    onError: (mutationError) => {
      toast.create({
        description:
          resolveErrorMessage(mutationError) ?? UNKNOWN_ERROR_MESSAGE,
        title: "Neplatný slevový kód",
        type: "error",
      })
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(updatedCart.id), updatedCart)
      toast.create({
        description: "Váš slevový kód byl aplikován",
        title: "Sleva aplikována",
        type: "success",
      })
    },
  })

  const errorMessage =
    cartQueryError instanceof Error ? cartQueryError.message : null

  return {
    addItem: (variantId: string, quantity?: number) => {
      addItemMutation.mutate({
        variantId,
        ...(quantity === undefined ? {} : { quantity }),
      })
    },
    addItemMutation,
    applyDiscount: (code: string) => {
      applyDiscountMutation.mutate(code)
    },
    applyDiscountMutation,
    cart,
    clearCart: () => {
      clearCartMutation.mutate()
    },
    clearCartMutation,
    closeCart: () => {
      setIsOpen(false)
    },
    discount: cart?.discount_total ?? 0,
    error: errorMessage,
    isLoading,
    isOpen,
    itemCount: cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    items: cart?.items ?? [],
    openCart: () => {
      setIsOpen(true)
    },
    refetch: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.cart(cart?.id),
      })
    },
    removeItem: (lineItemId: string) => {
      removeItemMutation.mutate(lineItemId)
    },
    removeItemMutation,
    shipping: cart?.shipping_total ?? 0,
    subtotal: cart?.subtotal ?? 0,
    tax: cart?.tax_total ?? 0,
    toggleCart: () => {
      setIsOpen((previousIsOpen) => !previousIsOpen)
    },
    total: cart?.total ?? 0,
    updateQuantity: (lineItemId: string, quantity: number) => {
      updateQuantityMutation.mutate({ lineItemId, quantity })
    },
    updateQuantityMutation,
  }
}

export { useCart }
