"use client"
import { Button } from "@ui/atoms/button"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { useAnalytics } from "@/providers/analytics-provider"
import type { PplAccessPointData } from "@/utils/address-helpers"
import { accessPointToShippingData } from "@/utils/address-helpers"
import { BillingAddressSection } from "./_components/billing-address-section"
import { OrderSummary } from "./_components/order-summary"
import { PaymentFormSection } from "./_components/payment-form-section"
import { PplPickupDialog } from "./_components/ppl-pickup-dialog"
import { ShippingMethodSection } from "./_components/shipping-method-section"
import {
  CheckoutProvider,
  useCheckoutContext,
} from "./_context/checkout-context"

export default function CheckoutPage() {
  return (
    <CheckoutProvider>
      <CheckoutContent />
    </CheckoutProvider>
  )
}

function CheckoutContent() {
  const router = useRouter()
  const {
    cart,
    hasItems,
    shipping,
    isReady,
    isCompleting,
    error,
    completeCheckout,
    selectedAccessPoint,
    openPickupDialog,
    isPickupDialogOpen,
    closePickupDialog,
    pendingOptionId,
    setSelectedAccessPoint,
  } = useCheckoutContext()
  const analytics = useAnalytics()

  // Track which cart we've already tracked to prevent duplicates
  const trackedCartId = useRef<string | null>(null)

  // Unified analytics - InitiateCheckout tracking (sends to Meta, Google, Leadhub)
  useEffect(() => {
    if (!(cart && hasItems)) {
      return
    }
    if (trackedCartId.current === cart.id) {
      return
    }

    trackedCartId.current = cart.id

    const items = cart.items || []
    const currency = (cart.currency_code ?? "CZK").toUpperCase()
    const value = cart.total ?? 0

    analytics.trackInitiateCheckout({
      value,
      currency,
      numItems: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
      productIds: items.map((item) => item.variant_id || ""),
    })
  }, [cart, hasItems, analytics])

  if (!(hasItems && cart)) {
    return (
      <div className="container mx-auto p-500">
        <h1 className="font-bold text-2xl text-fg-primary">Košík je prázdný</h1>
        <p className="mt-200 text-fg-secondary">
          Přidejte produkty do košíku před pokračováním na checkout.
        </p>
        <Button className="mt-400" onClick={() => router.push("/")}>
          Zpět na hlavní stránku
        </Button>
      </div>
    )
  }

  const selectedShipping = shipping.selectedOption

  // Handle PPL access point selection
  const handleAccessPointSelect = (accessPoint: PplAccessPointData | null) => {
    setSelectedAccessPoint(accessPoint)
    // If we have a pending option, set the shipping with the access point data
    if (pendingOptionId && accessPoint) {
      shipping.setShipping(
        pendingOptionId,
        accessPointToShippingData(accessPoint)
      )
    }
    closePickupDialog()
  }

  return (
    <div className="container mx-auto min-h-screen p-500">
      <h1 className="mb-500 font-bold text-3xl text-fg-primary">Pokladna</h1>

      <div className="grid grid-cols-1 gap-700 lg:grid-cols-2">
        <div className="[&>*+*]:mt-500">
          <BillingAddressSection />
          <ShippingMethodSection
            onOpenPickupDialog={openPickupDialog}
            selectedAccessPoint={selectedAccessPoint}
            shipping={shipping}
          />
          <PaymentFormSection />
        </div>
        <div>
          <OrderSummary
            cart={cart}
            errorMessage={error || ""}
            isCompletingCart={isCompleting}
            isReady={isReady}
            onBack={() => router.back()}
            onComplete={completeCheckout}
            selectedShipping={selectedShipping}
          />
        </div>
      </div>
      <PplPickupDialog
        onClose={closePickupDialog}
        onSelect={handleAccessPointSelect}
        open={isPickupDialogOpen}
        selectedPoint={selectedAccessPoint}
      />
    </div>
  )
}
