"use client"

import type { HttpTypes } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useEffect, useMemo, useState } from "react"
import { resolveCheckoutPaymentMethods } from "@/lib/checkout-payment-policy"
import { isCheckoutShippingOptionSupported } from "@/lib/checkout-shipping-policy"
import { STORAGE_KEYS } from "@/lib/constants"
import { queryKeys } from "@/lib/query-keys"
import { orderHelpers } from "@/stores/order-store"
import type { CheckoutAddressData, UseCheckoutReturn } from "@/types/checkout"
import {
  useStorefrontCompleteCart,
  useStorefrontUpdateCartAddress,
} from "./storefront-cart"
import {
  useStorefrontCheckoutPayment,
  useStorefrontCheckoutShipping,
} from "./storefront-checkout"
import { useCart } from "./use-cart"
import { useCustomer } from "./use-customer"

type CheckoutShippingOption = HttpTypes.StoreCartShippingOption & {
  provider_id?: string | null
  type?: {
    code?: string | null
  } | null
}

type ErrorResponse = {
  status?: number
  message?: string
  response?: {
    status?: number
    data?: {
      message?: string
    }
  }
}

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined
  }

  const err = error as ErrorResponse
  return err.status ?? err.response?.status
}

const getErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return ""
  }

  const err = error as ErrorResponse
  return (err.message ?? err.response?.data?.message ?? "").toLowerCase()
}

const isStaleCartError = (error: unknown): boolean => {
  const status = getErrorStatus(error)
  const message = getErrorMessage(error)
  return status === 404 || (message.includes("cart") && message.includes("not found"))
}

export function useCheckout(): UseCheckoutReturn {
  const { cart, refetch } = useCart()
  const { address } = useCustomer()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState("")
  const [selectedShipping, setSelectedShipping] = useState("")
  const [addressData, setAddressData] = useState<CheckoutAddressData | null>(
    null
  )
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const shippingCacheKey =
    typeof cart?.updated_at === "string"
      ? cart.updated_at
      : cart?.updated_at
        ? new Date(cart.updated_at).toISOString()
        : undefined

  const {
    shippingOptions,
    isLoading: isLoadingShippingOptions,
    isFetching: isFetchingShippingOptions,
    setShippingMethodAsync,
  } = useStorefrontCheckoutShipping({
    cart,
    cartId: cart?.id,
    cacheKey: shippingCacheKey,
    enabled: !!cart?.id,
    calculatePrices: false,
  })

  const {
    paymentProviders,
    initiatePaymentAsync,
  } = useStorefrontCheckoutPayment({
    cart,
    cartId: cart?.id,
    regionId: cart?.region_id ?? undefined,
    enabled: Boolean(cart?.id && cart?.region_id),
  })

  const completeCartMutation = useStorefrontCompleteCart()
  const updateCartAddressMutation = useStorefrontUpdateCartAddress()

  const supportedShippingOptions = useMemo(
    () => shippingOptions.filter(isCheckoutShippingOptionSupported),
    [shippingOptions]
  )

  const shippingMethods = supportedShippingOptions.map((option) => {
    const normalizedOption = option as CheckoutShippingOption

    return {
      id: option.id,
      name: option.name,
      calculated_price: option.calculated_price,
      provider_id: normalizedOption.provider_id ?? undefined,
      type_code: normalizedOption.type?.code ?? undefined,
    }
  })
  const paymentMethods = useMemo(
    () => resolveCheckoutPaymentMethods(paymentProviders),
    [paymentProviders]
  )
  const hasAddress = Boolean(addressData || cart?.shipping_address || address)

  const isLoadingShipping = isLoadingShippingOptions || isFetchingShippingOptions

  const recoverFromStaleCart = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.CART_ID)
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
    await refetch()

    setSelectedShipping("")
    setSelectedPayment("")
    setCurrentStep(0)

    toast.create({
      title: "Kosik vyprsel",
      description: "Vytvorili jsme novy kosik. Prosim zadejte adresu znovu.",
      type: "warning",
    })
  }

  useEffect(() => {
    if (!selectedShipping) {
      return
    }

    const selectedMethodStillAvailable = supportedShippingOptions.some(
      (option) => option.id === selectedShipping
    )

    if (!selectedMethodStillAvailable) {
      setSelectedShipping("")
    }
  }, [selectedShipping, supportedShippingOptions])

  useEffect(() => {
    if (!paymentMethods.length) {
      if (selectedPayment) {
        setSelectedPayment("")
      }
      return
    }

    const selectedMethodAvailable = paymentMethods.some(
      (method) => method.id === selectedPayment
    )

    if (!selectedMethodAvailable) {
      setSelectedPayment(paymentMethods[0].id)
    }
  }, [paymentMethods, selectedPayment])

  // Update addresses in cart
  const updateAddresses = async (data: CheckoutAddressData) => {
    if (!cart?.id) return

    try {
      await updateCartAddressMutation.mutateAsync({
        cartId: cart.id,
        email: data.shipping.email,
        shippingAddress: {
          first_name: data.shipping.firstName,
          last_name: data.shipping.lastName,
          address_1: data.shipping.street,
          city: data.shipping.city,
          postal_code: data.shipping.postalCode,
          phone: data.shipping.phone,
          country_code: (data.shipping.country || "CZ").toLowerCase(),
          company: data.shipping.company,
        },
        useSameAddress: data.useSameAddress,
        billingAddress: data.useSameAddress
          ? undefined
          : {
              first_name: data.billing.firstName,
              last_name: data.billing.lastName,
              address_1: data.billing.street,
              city: data.billing.city,
              postal_code: data.billing.postalCode,
              country_code: (data.billing.country || "CZ").toLowerCase(),
              company: data.billing.company,
            },
      })
      setAddressData(data)
    } catch (err) {
      if (isStaleCartError(err)) {
        await recoverFromStaleCart()
        throw err
      }

      console.error("Failed to update cart with addresses:", err)
      toast.create({
        title: "Chyba pri ukladani adresy",
        description: "Zkuste to prosim znovu",
        type: "error",
      })
      throw err
    }
  }

  // Add shipping method to cart
  const addShippingMethod = async (methodId: string) => {
    if (!cart?.id) return

    const methodAvailable = supportedShippingOptions.some(
      (option) => option.id === methodId
    )

    if (!methodAvailable) {
      toast.create({
        title: "Neplatny zpusob dopravy",
        description: "Tento zpusob dopravy neni momentalne dostupny.",
        type: "error",
      })
      return
    }

    try {
      await setShippingMethodAsync(methodId)
      await refetch()
    } catch (error) {
      if (isStaleCartError(error)) {
        await recoverFromStaleCart()
        throw error
      }

      console.error("Failed to add shipping method:", error)
      toast.create({
        title: "Chyba pri vyberu dopravy",
        description: "Zkuste to prosim znovu",
        type: "error",
      })
      throw error
    }
  }

  // Process order
  const processOrder = async () => {
    if (!cart?.id) return

    setIsProcessingPayment(true)

    try {
      await refetch()
      const currentCart =
        queryClient.getQueryData<HttpTypes.StoreCart>(queryKeys.cart(cart.id)) ??
        cart

      if (
        !currentCart.shipping_methods ||
        currentCart.shipping_methods.length === 0
      ) {
        toast.create({
          title: "Chyba",
          description: "Prosim vyberte zpusob dopravy",
          type: "error",
        })
        setCurrentStep(1)
        return
      }

      if (!currentCart.region_id) {
        toast.create({
          title: "Chyba",
          description: "Kosik nema nastaveny region",
          type: "error",
        })
        return
      }

      if (!paymentMethods.length) {
        toast.create({
          title: "Chyba",
          description: "Pro tento region neni dostupna zadna platebni metoda",
          type: "error",
        })
        return
      }

      const hasPaymentSessions =
        (currentCart.payment_collection?.payment_sessions?.length ?? 0) > 0

      if (!hasPaymentSessions) {
        const preferredProviderId =
          paymentMethods.find((provider) => provider.id === selectedPayment)
            ?.id ??
          paymentMethods[0]?.id ??
          "pp_system_default"

        await initiatePaymentAsync(preferredProviderId)
        await refetch()
      }

      const latestCart =
        queryClient.getQueryData<HttpTypes.StoreCart>(
          queryKeys.cart(currentCart.id)
        ) ?? currentCart

      const result = await completeCartMutation.mutateAsync({
        cartId: currentCart.id,
      })

      if (result.type === "order") {
        orderHelpers.saveCompletedOrder(latestCart)

        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.CART_ID)
        }

        await queryClient.invalidateQueries({
          queryKey: queryKeys.cart(),
        })

        await queryClient.invalidateQueries({
          queryKey: queryKeys.orders.all(),
        })

        return result.order
      }

      if (result.type === "cart" && result.error?.message) {
        throw new Error(result.error.message)
      }

      return undefined
    } catch (error) {
      if (isStaleCartError(error)) {
        await recoverFromStaleCart()
        throw error
      }

      console.error("Order creation error:", error)
      toast.create({
        title: "Chyba pri vytvareni objednavky",
        description:
          error instanceof Error ? error.message : "Neco se pokazilo. Zkuste to prosim znovu.",
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
      case 1: // Shipping
        return hasAddress
      case 2: // Payment
        return hasAddress && !!selectedShipping
      case 3: // Summary
        return hasAddress && !!selectedShipping && !!selectedPayment
      default:
        return true
    }
  }

  return {
    // State
    currentStep,
    selectedPayment,
    selectedShipping,
    addressData,
    isProcessingPayment,
    shippingMethods,
    paymentMethods,
    isLoadingShipping,

    // Actions
    setCurrentStep,
    setSelectedPayment,
    setSelectedShipping,
    setAddressData,
    updateAddresses,
    addShippingMethod,
    processOrder,
    canProceedToStep,
  }
}
