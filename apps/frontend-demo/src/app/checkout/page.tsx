"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Steps } from "@techsio/ui-kit/molecules/steps"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import Link from "next/link"
import { type ReactNode, useEffect, useState } from "react"
import { LoadingPage } from "@/components/loading-page"
import { OrderSummary } from "@/components/order-summary"
import { useCart } from "@/hooks/use-cart"
import { useCheckout } from "@/hooks/use-checkout"
import { PAYMENT_METHODS } from "@/lib/checkout-data"
import { formatPrice } from "@/lib/format-price"
import {
  type PacketaPickupPoint,
  pickPacketaPoint,
  toPacketaShippingData,
} from "@/lib/packeta"
import { orderHelpers } from "@/stores/order-store"
import { PaymentSelection } from "../../components/molecules/payment-selection"
import { ShippingSelection } from "../../components/molecules/shipping-selection"
import { AddressForm } from "../../components/organisms/address-form"
import { OrderPreview } from "../../components/organisms/order-preview"

type CheckoutStep = {
  content: ReactNode
  title: string
  value: number
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const updateMatches = () => setMatches(mediaQuery.matches)

    updateMatches()
    mediaQuery.addEventListener("change", updateMatches)

    return () => mediaQuery.removeEventListener("change", updateMatches)
  }, [query])

  return matches
}

export default function CheckoutPage() {
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
  const [pickupPoint, setPickupPoint] = useState<PacketaPickupPoint | null>(
    null
  )
  const toast = useToast()
  const isDesktopSteps = useMediaQuery("(min-width: 640px)")

  // Redirect if cart is empty and no completed order
  useEffect(() => {
    // Wait for cart to load before checking
    if (!isLoading) {
      const hasCompletedOrder = orderHelpers.getOrderData(null) !== null

      // Only redirect if cart is empty AND no completed order exists
      if (
        (!cart || cart.items?.length === 0) &&
        !hasCompletedOrder &&
        !isOrderComplete
      ) {
        //  router.push('/cart')
      }
    }
  }, [cart, isLoading, isOrderComplete])

  // Show loading state while cart is loading
  if (isLoading) {
    return <LoadingPage />
  }

  // Get order data (either from cart or saved completed order)
  const orderData = orderHelpers.getOrderData(cart)

  if (!orderData?.items || orderData.items.length === 0) {
    return null
  }

  const selectedShippingMethod = shippingMethods?.find(
    (m) => m.id === selectedShipping
  )
  const selectedPaymentMethod = PAYMENT_METHODS.find(
    (m) => m.id === selectedPayment
  )
  const shippingPrice =
    selectedShippingMethod?.calculated_price.calculated_amount || 0

  const paymentFee = selectedPaymentMethod?.fee || 0

  const handleComplete = async () => {
    // For other payment methods, process directly
    try {
      const order = await processOrder()
      if (order) {
        setOrderNumber(
          String(order.display_id) || `CZ${Date.now().toString().slice(-8)}`
        )
        setIsOrderComplete(true)
        setCurrentStep(3)
      }
    } catch (_error) {
      // Error already handled in hook
    }
  }

  const steps: CheckoutStep[] = [
    {
      value: 0,
      title: "Adresa",
      content: (
        <AddressForm
          onComplete={async (data) => {
            try {
              await updateAddresses(data)
              setCurrentStep(1)
            } catch (_err) {
              // Error already handled in hook
            }
          }}
        />
      ),
    },
    {
      value: 1,
      title: "Doprava",
      content: (
        <ShippingSelection
          currentStep={currentStep}
          isLoading={isLoadingShipping}
          onSelect={async (method) => {
            const option = shippingMethods?.find((m) => m.id === method)
            const isPacketa = option?.provider_id === "packeta_packeta"

            if (isPacketa) {
              try {
                const apiKey =
                  process.env.NEXT_PUBLIC_PACKETA_WIDGET_API_KEY ?? ""
                const point = await pickPacketaPoint(apiKey)
                if (!point) {
                  return
                }
                setPickupPoint(point)
                setSelectedShipping(method)
                await addShippingMethod(method, toPacketaShippingData(point))
              } catch (error) {
                toast.create({
                  type: "error",
                  title: "Chyba při výběru výdejního místa",
                  description:
                    error instanceof Error
                      ? error.message
                      : "Zkuste to prosím znovu",
                })
              }
              return
            }

            setPickupPoint(null)
            setSelectedShipping(method)
            try {
              await addShippingMethod(method)
            } catch (_error) {
              // Error already handled in hook
            }
          }}
          pickupPoint={pickupPoint}
          selected={selectedShipping}
          setCurrentStep={setCurrentStep}
          shippingMethods={shippingMethods}
        />
      ),
    },
    {
      value: 2,
      title: "Platba",
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
    },
    {
      value: 3,
      title: "Souhrn",
      content: (
        <OrderSummary
          addressData={addressData || undefined}
          isLoading={isProcessingPayment}
          isOrderComplete={isOrderComplete}
          onCompleteClick={handleComplete}
          onEditClick={() => setCurrentStep(currentStep - 1)}
          orderNumber={orderNumber}
          selectedPayment={selectedPaymentMethod}
          selectedShipping={selectedShippingMethod}
        />
      ),
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
      onStepChange={(details) => handleStepChange(details.step)}
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
          onClick={() => setShowOrderSummary(!showOrderSummary)}
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
