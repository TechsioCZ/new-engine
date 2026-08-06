"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Steps } from "@techsio/ui-kit/molecules/steps"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"

import { LoadingPage } from "@/components/loading-page"
import { OrderSummary } from "@/components/order-summary"
import { useCart } from "@/hooks/use-cart"
import { useCheckout } from "@/hooks/use-checkout"
import { PAYMENT_METHODS } from "@/lib/checkout-data"
import { formatPrice } from "@/lib/format-price"
import { orderHelpers } from "@/stores/order-store"

import { PaymentSelection } from "../../components/molecules/payment-selection"
import { ShippingSelection } from "../../components/molecules/shipping-selection"
import { AddressForm } from "../../components/organisms/address-form"
import { OrderPreview } from "../../components/organisms/order-preview"

interface CheckoutStep {
  content: ReactNode
  title: string
  value: number
}

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const updateMatches = () => {
      setMatches(mediaQuery.matches)
    }

    updateMatches()
    mediaQuery.addEventListener("change", updateMatches)

    return () => {
      mediaQuery.removeEventListener("change", updateMatches)
    }
  }, [query])

  return matches
}

const CheckoutPage = () => {
  const { cart, isLoading } = useCart()

  const {
    currentStep,
    selectedPayment,
    selectedShipping,
    addressData,
    isProcessingPayment,
    setCurrentStep,
    setSelectedPayment,
    setSelectedShipping,
    updateAddresses,
    addShippingMethod,
    processOrder,
    canProceedToStep,
    shippingMethods,
    isLoadingShipping,
  } = useCheckout()

  const [isOrderComplete, setIsOrderComplete] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string>("")
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const isDesktopSteps = useMediaQuery("(min-width: 640px)")

  // Show loading state while cart is loading
  if (isLoading) {
    return <LoadingPage />
  }

  // Get order data (either from cart or saved completed order)
  const orderData = orderHelpers.getOrderData(cart)

  if (
    orderData?.items === null ||
    orderData?.items === undefined ||
    orderData.items.length === 0
  ) {
    return null
  }

  const selectedShippingMethod = shippingMethods?.find(
    (m) => m.id === selectedShipping,
  )
  const selectedPaymentMethod = PAYMENT_METHODS.find(
    (m) => m.id === selectedPayment,
  )
  const shippingPrice =
    selectedShippingMethod?.calculated_price.calculated_amount ?? 0

  const paymentFee = selectedPaymentMethod?.fee ?? 0

  const completeOrder = async () => {
    try {
      const order = await processOrder()
      if (order === undefined) {
        return
      }

      const displayId = order.display_id
      setOrderNumber(
        displayId === null || displayId === undefined
          ? `CZ${Date.now().toString().slice(-8)}`
          : String(displayId),
      )
      setIsOrderComplete(true)
      setCurrentStep(3)
    } catch (error: unknown) {
      console.error("Checkout completion failed:", error)
    }
  }

  const handleComplete = () => {
    void completeOrder()
  }

  const updateShippingMethod = async (method: string) => {
    try {
      await addShippingMethod(method)
    } catch (error: unknown) {
      console.error("Checkout shipping update failed:", error)
    }
  }

  const handleShippingSelect = (method: string) => {
    setSelectedShipping(method)
    void updateShippingMethod(method)
  }

  const steps: CheckoutStep[] = [
    {
      content: (
        <AddressForm
          onComplete={async (data) => {
            try {
              await updateAddresses(data)
              setCurrentStep(1)
            } catch (error: unknown) {
              console.error("Checkout address update failed:", error)
            }
          }}
        />
      ),
      title: "Adresa",
      value: 0,
    },
    {
      content: (
        <ShippingSelection
          currentStep={currentStep}
          isLoading={isLoadingShipping}
          onSelect={handleShippingSelect}
          selected={selectedShipping}
          setCurrentStep={setCurrentStep}
          shippingMethods={shippingMethods}
        />
      ),
      title: "Doprava",
      value: 1,
    },
    {
      content: (
        <PaymentSelection
          currentStep={currentStep}
          onSelect={(method) => {
            setSelectedPayment(method)
            setCurrentStep(3)
          }}
          selected={selectedPayment}
          setCurrentStep={setCurrentStep}
        />
      ),
      title: "Platba",
      value: 2,
    },
    {
      content: (
        <OrderSummary
          {...(addressData !== null && { addressData })}
          isLoading={isProcessingPayment}
          isOrderComplete={isOrderComplete}
          onCompleteClick={handleComplete}
          onEditClick={() => {
            setCurrentStep(currentStep - 1)
          }}
          orderNumber={orderNumber}
          selectedPayment={selectedPaymentMethod}
          selectedShipping={selectedShippingMethod}
        />
      ),
      title: "Souhrn",
      value: 3,
    },
  ]

  const handleStepChange = (step: number) => {
    // Allow backward navigation
    if (step < currentStep) {
      setCurrentStep(step)
      return
    }

    // Only allow forward movement if current step is completed
    if (step > currentStep && !canProceedToStep(step)) {
      return
    }

    setCurrentStep(step)
  }

  const renderSteps = (orientation: "horizontal" | "vertical") => (
    <Steps
      count={steps.length}
      linear={false}
      onStepChange={(details) => {
        handleStepChange(details.step)
      }}
      orientation={orientation}
      step={currentStep}
    >
      <Steps.List>
        {steps.map((step) => (
          <Steps.Item index={step.value} key={step.value}>
            <Steps.Trigger>
              <Steps.Indicator />
              <Steps.ItemText>
                <Steps.Title>{step.title}</Steps.Title>
              </Steps.ItemText>
            </Steps.Trigger>
            <Steps.Separator />
          </Steps.Item>
        ))}
      </Steps.List>

      <Steps.Panels>
        {steps.map((step) => (
          <Steps.Content index={step.value} key={step.value}>
            {step.content}
          </Steps.Content>
        ))}
      </Steps.Panels>
    </Steps>
  )

  return (
    <div className="container mx-auto max-w-[80rem] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      {/* Mobile/Tablet: Sticky progress bar */}
      <div
        className="-mx-4 sm:-mx-6 sticky top-0 z-2 mb-4 border-border border-b-2 bg-base px-4 pb-4 shadow-sm sm:px-6 lg:relative lg:mx-0 lg:border-b-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:shadow-none"
        id="payment-header"
      >
        <div className="mb-4 flex items-center gap-3 pt-4 lg:mb-6 lg:pt-0">
          <Link
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-hover lg:h-auto lg:w-auto"
            href="/cart"
          >
            <Icon
              className="text-fg-primary text-lg hover:text-fg-secondary"
              icon="token-icon-arrow-left"
            />
          </Link>
          <h1 className="font-bold text-2xl sm:text-3xl">
            Dokončení objednávky
          </h1>
        </div>

        {/* Mobile: Collapsible order summary */}
        <Button
          className="bg-surface text-fg-primary hover:bg-surface-hover active:bg-surface-hover lg:hidden"
          icon={
            showOrderSummary
              ? "token-icon-chevron-up"
              : "token-icon-chevron-down"
          }
          iconPosition="left"
          onClick={() => {
            setShowOrderSummary(!showOrderSummary)
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {showOrderSummary ? "Skrýt" : "Zobrazit"} souhrn objednávky
            </span>
          </div>
          <span className="font-bold">
            {formatPrice(orderData?.total || 0 + shippingPrice + paymentFee)}
          </span>
        </Button>
        {/* Mobile: Collapsible order summary content */}
        {showOrderSummary && (
          <div className="-mx-4 sm:-mx-6 mb-6 py-4 sm:px-6 lg:hidden">
            <OrderPreview
              paymentFee={paymentFee}
              shippingPrice={shippingPrice}
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
        {renderSteps(isDesktopSteps ? "horizontal" : "vertical")}

        {/* Desktop: Sticky sidebar */}
        <div className="hidden lg:block lg:pl-8">
          <div className="sticky top-8">
            <OrderPreview
              paymentFee={paymentFee}
              shippingPrice={shippingPrice}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
