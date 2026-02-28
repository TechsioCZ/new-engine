"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Steps } from "@techsio/ui-kit/molecules/steps"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LoadingPage } from "@/components/loading-page"
import { OrderSummary } from "@/components/order-summary"
import { useCart } from "@/hooks/use-cart"
import { useCheckout } from "@/hooks/use-checkout"
import { getShippingAmount } from "@/lib/checkout-shipping-pricing"
import { formatPrice } from "@/lib/format-price"
import { orderHelpers } from "@/stores/order-store"
import { PaymentSelection } from "../../components/molecules/payment-selection"
import { ShippingSelection } from "../../components/molecules/shipping-selection"
import { AddressForm } from "../../components/organisms/address-form"
import { OrderPreview } from "../../components/organisms/order-preview"

export default function CheckoutPage() {
  const { cart, isLoading } = useCart()
  const router = useRouter()

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
    paymentMethods,
    isLoadingShipping,
  } = useCheckout()

  const [isOrderComplete, setIsOrderComplete] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string>("")
  const [showOrderSummary, setShowOrderSummary] = useState(false)

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
        router.replace("/cart")
      }
    }
  }, [cart, isLoading, isOrderComplete, router])

  // Show loading state while cart is loading
  if (isLoading) return <LoadingPage />

  // Get order data (either from cart or saved completed order)
  const orderData = orderHelpers.getOrderData(cart)

  if (!(orderData && orderData.items) || orderData.items.length === 0) {
    return (
      <div className="container mx-auto max-w-[52rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <h1 className="font-semibold text-2xl text-fg-primary">
            Kosik je prazdny
          </h1>
          <p className="mt-2 text-fg-secondary text-sm">
            Presmerovavame vas zpet do kosiku. Pokud se to nestane automaticky,
            pokracujte tlacitkem nize.
          </p>
          <div className="mt-5">
            <Link
              className="inline-flex items-center rounded-md border border-border px-4 py-2 font-medium text-sm hover:bg-surface-hover"
              href="/cart"
            >
              Prejit do kosiku
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const selectedShippingMethod = shippingMethods?.find(
    (m) => m.id === selectedShipping
  )
  const selectedPaymentMethod = paymentMethods.find(
    (m) => m.id === selectedPayment
  )
  const shippingPrice = getShippingAmount(selectedShippingMethod)

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
    } catch (error) {
      // Error already handled in hook
    }
  }

  const steps = [
    {
      value: 0,
      title: "Adresa",
      content: (
        <AddressForm
          onComplete={async (data) => {
            try {
              await updateAddresses(data)
              setCurrentStep(1)
            } catch (err) {
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
            setSelectedShipping(method)
            try {
              await addShippingMethod(method)
            } catch (error) {
              // Error already handled in hook
            }
          }}
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
          paymentMethods={paymentMethods}
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
            {formatPrice((orderData?.total ?? 0) + paymentFee)}
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
        <div className="hidden sm:block">
          <Steps
            currentStep={currentStep}
            items={steps}
            linear={false}
            onStepChange={handleStepChange}
            onStepComplete={handleComplete}
            orientation="horizontal"
            showControls={false}
          />
        </div>
        <div className="sm:hidden">
          <Steps
            currentStep={currentStep}
            items={steps}
            linear={false}
            onStepChange={handleStepChange}
            onStepComplete={handleComplete}
            orientation="vertical"
            showControls={false}
          />
        </div>

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
