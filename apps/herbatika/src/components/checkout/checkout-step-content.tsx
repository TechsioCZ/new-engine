import { useTranslations } from "next-intl"

import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils"
import type { CheckoutStepSlug } from "@/components/checkout/checkout.constants"
import { CheckoutCartSidebarSection } from "@/components/checkout/sections/checkout-cart-sidebar-section"
import { CheckoutCartStepSection } from "@/components/checkout/sections/checkout-cart-step-section"
import { CheckoutCompleteSection } from "@/components/checkout/sections/checkout-complete-section"
import { CheckoutDetailsStepSection } from "@/components/checkout/sections/checkout-details-step-section"
import { CheckoutOrderSummarySection } from "@/components/checkout/sections/checkout-order-summary-section"
import { CheckoutShippingPaymentStepSection } from "@/components/checkout/sections/checkout-shipping-payment-step-section"
import type { CheckoutController } from "@/components/checkout/use-checkout-controller"

import { resolveSelectedPaymentLabel } from "./checkout-payment-label"
import { CheckoutStepLayout } from "./checkout-step-layout"

interface CheckoutStepContentProps {
  activeStep: CheckoutStepSlug
  controller: CheckoutController
}

export const CheckoutStepContent = ({
  activeStep,
  controller,
}: CheckoutStepContentProps) => {
  const tCart = useTranslations("cart")
  const tCheckout = useTranslations("checkout")
  const cartStepHref = resolveCheckoutStepHref("kosik")
  const shippingStepHref = resolveCheckoutStepHref("doprava-platba")
  const detailsStepHref = resolveCheckoutStepHref("udaje")
  const summaryStepHref = resolveCheckoutStepHref("suhrn")
  const { selectedPaymentProviderId } = controller
  const selectedShippingOption = controller.checkoutShippingQuery.selectedOption
  const selectedShippingLabel = selectedShippingOption?.name ?? undefined
  const selectedShippingOptionId =
    controller.checkoutShippingQuery.selectedShippingMethodId
  const selectedPaymentLabel = resolveSelectedPaymentLabel({
    providerId: selectedPaymentProviderId,
    translate: tCheckout,
  })
  const orderSummaryDetailsFont = activeStep === "kosik" ? "rubik" : "inter"
  const orderSummaryAside = (
    <CheckoutOrderSummarySection
      cartItems={controller.cartItems}
      cartItemsWithoutTaxAmount={controller.cartItemsSubtotalAmount}
      cartTaxAmount={controller.cartTaxAmount}
      cartTotalAmount={controller.cartTotalAmount}
      currencyCode={controller.currencyCode}
      detailsFont={orderSummaryDetailsFont}
      {...(selectedPaymentLabel === null
        ? {}
        : { paymentLabel: selectedPaymentLabel })}
      shippingAmount={controller.cartShippingSubtotalAmount}
      {...(selectedShippingLabel === undefined
        ? {}
        : { shippingLabel: selectedShippingLabel })}
    />
  )

  switch (activeStep) {
    case "kosik": {
      return (
        <CheckoutStepLayout
          aside={
            <CheckoutCartSidebarSection
              cartItemsTotalAmount={controller.cartItemsSubtotalAmount}
              cartTaxAmount={controller.cartTaxAmount}
              cartTotalAmount={controller.cartTotalAmount}
              currencyCode={controller.currencyCode}
              hasShipping={controller.hasShipping}
              nextStepHref={shippingStepHref}
              shippingAmount={controller.cartShippingSubtotalAmount}
              {...(selectedShippingLabel === undefined
                ? {}
                : { shippingLabel: selectedShippingLabel })}
            />
          }
          cartItems={controller.cartItems}
          header={
            <h2 className="col-span-full font-inter font-semibold text-2xl text-fg-primary leading-tight">
              {tCart("title_with_count", {
                count: controller.cartItems.length,
              })}
            </h2>
          }
        >
          <CheckoutCartStepSection
            {...(controller.cartQuery.cart?.id === undefined
              ? {}
              : { cartId: controller.cartQuery.cart?.id })}
            cartItems={controller.cartItems}
            cartItemsTotalAmount={controller.cartItemsTotalAmount}
            currencyCode={controller.currencyCode}
          />
        </CheckoutStepLayout>
      )
    }
    case "doprava-platba": {
      return (
        <CheckoutStepLayout aside={orderSummaryAside}>
          <CheckoutShippingPaymentStepSection
            backStepHref={cartStepHref}
            controller={controller}
            nextStepHref={detailsStepHref}
            selectedPaymentProviderId={selectedPaymentProviderId}
          />
        </CheckoutStepLayout>
      )
    }
    case "udaje": {
      return (
        <CheckoutStepLayout aside={orderSummaryAside}>
          <CheckoutDetailsStepSection
            backStepHref={shippingStepHref}
            controller={controller}
            nextStepHref={summaryStepHref}
          />
        </CheckoutStepLayout>
      )
    }
    case "suhrn": {
      return (
        <CheckoutStepLayout aside={orderSummaryAside}>
          <CheckoutCompleteSection
            cartTaxAmount={controller.cartTaxAmount}
            cartTotalAmount={controller.cartTotalAmount}
            cartTotalWithoutTaxAmount={controller.cartTotalWithoutTaxAmount}
            currencyCode={controller.currencyCode}
            detailsStepHref={detailsStepHref}
            heurekaConsent={controller.heurekaConsent}
            marketingConsent={controller.marketingConsent}
            onCompleteOrder={controller.handleCompleteOrder}
            onHeurekaConsentChange={(value) => {
              controller.setHeurekaConsent(value)
            }}
            onMarketingConsentChange={(value) => {
              controller.setMarketingConsent(value)
            }}
            state={{
              canCompleteOrder: controller.canCompleteOrder,
              hasPayment: controller.hasPayment,
              hasShipping: controller.hasShipping,
              hasStoredAddress: controller.hasStoredAddress,
              isCompletingOrder:
                controller.checkoutPaymentQuery.isInitiatingPayment ||
                controller.completeCheckoutMutation.isPending,
            }}
            {...(selectedPaymentLabel === null
              ? {}
              : { paymentLabel: selectedPaymentLabel })}
            {...(selectedPaymentProviderId === undefined
              ? {}
              : { paymentProviderId: selectedPaymentProviderId ?? undefined })}
            shippingAddressForm={controller.shippingAddressForm}
            {...(selectedShippingLabel === undefined
              ? {}
              : { shippingLabel: selectedShippingLabel })}
            {...(selectedShippingOptionId === undefined
              ? {}
              : { shippingOptionId: selectedShippingOptionId })}
            shippingStepHref={shippingStepHref}
          />
        </CheckoutStepLayout>
      )
    }
    default: {
      const unhandledStep: never = activeStep
      throw new Error(`Unhandled checkout step: ${String(unhandledStep)}`)
    }
  }
}
