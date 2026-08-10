"use client"

import type { HttpTypes } from "@medusajs/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useState } from "react"

import { cacheConfig } from "@/lib/cache-config"
import { STORAGE_KEYS } from "@/lib/constants"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import { orderHelpers } from "@/stores/order-store"
import type { CheckoutAddressData, UseCheckoutReturn } from "@/types/checkout"

import { useCart } from "./use-cart"
import { useCustomer } from "./use-customer"

export const useCheckout = (): UseCheckoutReturn => {
  const { cart, refetch, clearCart } = useCart()
  const { address } = useCustomer()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState("")
  const [selectedShipping, setSelectedShipping] = useState("")
  const [addressData, setAddressData] = useState<CheckoutAddressData | null>(
    null,
  )
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Update addresses in cart
  const updateAddresses = async (data: CheckoutAddressData) => {
    const cartId = cart?.id
    if (cartId === undefined || cartId.length === 0) {
      return
    }

    try {
      await sdk.store.cart.update(cartId, {
        billing_address: data.useSameAddress
          ? {
              address_1: data.shipping.street,
              city: data.shipping.city,
              company: data.shipping.company ?? null,
              country_code: (data.shipping.country || "CZ").toLowerCase(),
              first_name: data.shipping.firstName,
              last_name: data.shipping.lastName,
              phone: data.shipping.phone,
              postal_code: data.shipping.postalCode,
            }
          : {
              address_1: data.billing.street,
              city: data.billing.city,
              company: data.billing.company ?? null,
              country_code: (data.billing.country || "CZ").toLowerCase(),
              first_name: data.billing.firstName,
              last_name: data.billing.lastName,
              postal_code: data.billing.postalCode,
            },
        email: data.shipping.email,
        shipping_address: {
          address_1: data.shipping.street,
          city: data.shipping.city,
          company: data.shipping.company ?? null,
          country_code: (data.shipping.country || "CZ").toLowerCase(),
          first_name: data.shipping.firstName,
          last_name: data.shipping.lastName,
          phone: data.shipping.phone,
          postal_code: data.shipping.postalCode,
        },
      })
      setAddressData(data)
    } catch (error) {
      console.error("Failed to update cart with addresses:", error)
      toast.create({
        description: "Zkuste to prosím znovu",
        title: "Chyba při ukládání adresy",
        type: "error",
      })
      throw error
    }
  }

  const {
    data: shippingMethods,
    isLoading: isLoadingShipping,
    error: shippingError,
  } = useQuery({
    enabled: cart?.id !== undefined && cart.id.length > 0,
    queryFn: async () => {
      const cartId = cart?.id
      if (cartId === undefined || cartId.length === 0) {
        throw new Error("No cart ID available")
      }
      const response = await sdk.store.fulfillment.listCartOptions({
        cart_id: cartId,
      })

      const reducedShippingMethods = response.shipping_options.map((o) => ({
        calculated_price: o.calculated_price,
        id: o.id,
        name: o.name,
      }))
      return reducedShippingMethods
    },
    queryKey: queryKeys.fulfillment.cartOptions(cart?.id ?? ""),
    ...cacheConfig.semiStatic,
  })

  // Add shipping method to cart
  const addShippingMethod = async (methodId: string) => {
    const cartId = cart?.id
    if (cartId === undefined || cartId.length === 0) {
      return
    }

    try {
      await sdk.store.cart.addShippingMethod(cartId, {
        option_id: methodId,
      })
      await refetch()
    } catch (error) {
      console.error("Failed to add shipping method:", error)
      toast.create({
        description: "Zkuste to prosím znovu",
        title: "Chyba při výběru dopravy",
        type: "error",
      })
      throw error
    }
  }

  // Process order
  const processOrder: UseCheckoutReturn["processOrder"] = async () => {
    let completedOrder: HttpTypes.StoreOrder | undefined
    const cartId = cart?.id
    if (cartId === undefined || cartId.length === 0) {
      return completedOrder
    }

    setIsProcessingPayment(true)

    try {
      // Get fresh cart state
      const { cart: currentCart } = await sdk.store.cart.retrieve(cartId)

      // Check shipping method
      if (
        !currentCart.shipping_methods ||
        currentCart.shipping_methods.length === 0
      ) {
        toast.create({
          description: "Prosím vyberte způsob dopravy",
          title: "Chyba",
          type: "error",
        })
        setCurrentStep(1)
        return completedOrder
      }

      // Initialize payment if needed
      if (!currentCart.payment_collection) {
        if (
          currentCart.region_id === undefined ||
          currentCart.region_id.length === 0
        ) {
          toast.create({
            description: "Košík nemá nastavenou region",
            title: "Chyba",
            type: "error",
          })
          return completedOrder
        }

        const providers = await sdk.store.payment.listPaymentProviders({
          region_id: currentCart.region_id,
        })

        const [provider] = providers.payment_providers ?? []
        if (provider !== undefined) {
          await sdk.store.payment.initiatePaymentSession(currentCart, {
            provider_id: provider.id,
          })
        }
      }

      // Refresh cart to get payment collection
      const { cart: latestCart } = await sdk.store.cart.retrieve(cartId)

      // Create payment session if needed
      if (
        !latestCart.payment_collection?.payment_sessions ||
        latestCart.payment_collection.payment_sessions.length === 0
      ) {
        await sdk.store.payment.initiatePaymentSession(latestCart, {
          provider_id: "pp_system_default",
        })
      }

      // Complete order
      const result = await sdk.store.cart.complete(cartId)

      if (result.type === "order") {
        const { order } = result
        completedOrder = order

        // Save completed order data
        orderHelpers.saveCompletedOrder(currentCart)

        // Clear cart from localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.CART_ID)
        }

        clearCart()

        // Invalidate orders cache to refresh the list
        await queryClient.invalidateQueries({
          queryKey: queryKeys.orders.all(),
        })

        // Return success with order data
        return completedOrder
      }

      return completedOrder
    } catch (error) {
      console.error("Order creation error:", error)
      toast.create({
        description:
          error instanceof Error
            ? error.message
            : "Něco se pokazilo. Zkuste to prosím znovu.",
        title: "Chyba při vytváření objednávky",
        type: "error",
      })
      throw error
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Check if can proceed to step
  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1: {
        // Shipping
        return address !== null
      }
      case 2: {
        // Payment
        return address !== null && selectedShipping.length > 0
      }
      case 3: {
        // Summary
        return (
          address !== null &&
          selectedShipping.length > 0 &&
          selectedPayment.length > 0
        )
      }
      default: {
        return true
      }
    }
  }

  return {
    addShippingMethod,
    addressData,
    canProceedToStep,
    currentStep,
    isLoadingShipping,
    isProcessingPayment,
    processOrder,
    selectedPayment,
    selectedShipping,
    setAddressData,
    setCurrentStep,
    setSelectedPayment,
    setSelectedShipping,
    shippingError,
    shippingMethods,
    updateAddresses,
  }
}
