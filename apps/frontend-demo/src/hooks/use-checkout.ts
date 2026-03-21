"use client"

import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useState } from "react"
import { storefront, storefrontFlows } from "@/lib/storefront"
import { orderHelpers } from "@/stores/order-store"
import type { CheckoutAddressData, UseCheckoutReturn } from "@/types/checkout"
import { useCart } from "./use-cart"
import { useCustomer } from "./use-customer"

const toCartAddressInput = (data: CheckoutAddressData) => ({
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
  billingAddress: data.useSameAddress
    ? {
        first_name: data.shipping.firstName,
        last_name: data.shipping.lastName,
        address_1: data.shipping.street,
        city: data.shipping.city,
        postal_code: data.shipping.postalCode,
        phone: data.shipping.phone,
        country_code: (data.shipping.country || "CZ").toLowerCase(),
        company: data.shipping.company,
      }
    : {
        first_name: data.billing.firstName,
        last_name: data.billing.lastName,
        address_1: data.billing.street,
        city: data.billing.city,
        postal_code: data.billing.postalCode,
        country_code: (data.billing.country || "CZ").toLowerCase(),
        company: data.billing.company,
      },
  useSameAddress: data.useSameAddress,
})

export function useCheckout(): UseCheckoutReturn {
  const { cart } = useCart()
  const { address } = useCustomer()
  const toast = useToast()

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState("")
  const [selectedShipping, setSelectedShipping] = useState("")
  const [addressData, setAddressData] = useState<CheckoutAddressData | null>(
    null
  )
  const [shippingError, setShippingError] = useState<Error | null>(null)

  const updateAddressMutation = storefront.hooks.cart.useUpdateCartAddress({
    onError: () => {
      toast.create({
        title: "Chyba při ukládání adresy",
        description: "Zkuste to prosím znovu",
        type: "error",
      })
    },
  })

  const shipping = storefront.hooks.checkout.useCheckoutShipping(
    {
      cartId: cart?.id,
      cart,
      enabled: !!cart?.id,
    },
    {
      onError: (error) => {
        setShippingError(
          error instanceof Error
            ? error
            : new Error("Nepodařilo se načíst dopravu")
        )
      },
    }
  )

  const payment = storefront.hooks.checkout.useCheckoutPayment(
    {
      cartId: cart?.id,
      regionId: cart?.region_id ?? undefined,
      cart,
      enabled: !!cart?.id,
    },
    {
      onError: () => {
        toast.create({
          title: "Chyba při inicializaci platby",
          description: "Zkuste to prosím znovu",
          type: "error",
        })
      },
    }
  )

  const completeCheckoutMutation = storefrontFlows.checkout.useCompleteCheckout(
    {
      cartId: cart?.id,
      cart,
      regionId: cart?.region_id ?? undefined,
      enabled: !!cart?.id,
    },
    {
      resolvePaymentProviderId: ({
        paymentProviders,
        existingPaymentProviderId,
      }) =>
        paymentProviders.find((provider) => provider.id === selectedPayment)
          ?.id ??
        existingPaymentProviderId ??
        paymentProviders[0]?.id ??
        null,
    }
  )

  const updateAddresses = async (data: CheckoutAddressData) => {
    if (!cart?.id) {
      return
    }

    await updateAddressMutation.mutateAsync({
      cartId: cart.id,
      ...toCartAddressInput(data),
    })
    setAddressData(data)
  }

  const addShippingMethod = async (methodId: string) => {
    if (!cart?.id) {
      return
    }

    setShippingError(null)

    try {
      await shipping.setShippingMethodAsync(methodId)
    } catch (error) {
      toast.create({
        title: "Chyba při výběru dopravy",
        description: "Zkuste to prosím znovu",
        type: "error",
      })
      throw error
    }
  }

  const processOrder = async () => {
    if (!cart?.id) {
      return
    }

    if (!shipping.selectedShippingMethodId) {
      toast.create({
        title: "Chyba",
        description: "Prosím vyberte způsob dopravy",
        type: "error",
      })
      setCurrentStep(1)
      return
    }

    try {
      const result = await completeCheckoutMutation.mutateAsync(undefined)
      orderHelpers.saveCompletedOrder(cart)
      return result.order
    } catch (error) {
      toast.create({
        title: "Chyba při vytváření objednávky",
        description:
          error instanceof Error
            ? error.message
            : "Něco se pokazilo. Zkuste to prosím znovu.",
        type: "error",
      })
      throw error
    }
  }

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1:
        return !!address
      case 2:
        return !!address && !!selectedShipping
      case 3:
        return !!address && !!selectedShipping && !!selectedPayment
      default:
        return true
    }
  }

  return {
    currentStep,
    selectedPayment,
    selectedShipping,
    addressData,
    isProcessingPayment:
      completeCheckoutMutation.isPending || payment.isInitiatingPayment,
    shippingMethods: shipping.shippingOptions,
    isLoadingShipping:
      shipping.isLoading || shipping.isFetching || shipping.isCalculating,
    shippingError,
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
