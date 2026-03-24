"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Steps } from "@techsio/ui-kit/molecules/steps"
import Link from "next/link"
import { type ReactNode, useState } from "react"
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

type CheckoutStep = {
  content: ReactNode
  title: string
  value: number
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

  if (isLoading) {
    return <LoadingPage />
  }

  const orderData = orderHelpers.getOrderData(cart)

  if (!orderData?.items?.length) {
    return null
  }

  const selectedShippingMethod = shippingMethods?.find(
    (method) => method.id === selectedShipping
  )
  const selectedPaymentMethod = PAYMENT_METHODS.find(
    (method) => method.id === selectedPayment
  )
  const shippingPrice =
    selectedShippingMethod?.calculated_price.calculated_amount || 0
  const paymentFee = selectedPaymentMethod?.fee || 0
  const finalTotal = (orderData?.total ?? 0) + paymentFee

  const handleComplete = async () => {
    try {
      const order = await processOrder()
      if (order) {
        setOrderNumber(
          String(order.display_id) || `CZ${Date.now().toString().slice(-8)}`
        )
        setIsOrderComplete(true)
        setCurrentStep(3)
      }
    } catch {
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
            } catch {
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
            try {
              await addShippingMethod(method)
            } catch {
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
    if (step < currentStep) {
      setCurrentStep(step)
      return
    }

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
          <span className="font-bold">{formatPrice(finalTotal)}</span>
        </Button>

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
        <div className="hidden sm:block">{renderSteps("horizontal")}</div>
        <div className="sm:hidden">{renderSteps("vertical")}</div>

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
