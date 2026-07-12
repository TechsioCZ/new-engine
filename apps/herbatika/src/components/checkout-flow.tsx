"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  CHECKOUT_STEPS,
  type CheckoutStepId,
  type CheckoutStepSlug,
} from "@/components/checkout/checkout.constants"
import {
  canAccessCheckoutStep,
  resolveCheckoutStepHref,
  resolveCheckoutStepIndexBySlug,
  resolveRequiredCheckoutStepSlug,
} from "@/components/checkout/checkout-route.utils"
import { CheckoutStepContent } from "@/components/checkout/checkout-step-content"
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section"
import { CheckoutEmptyCartSection } from "@/components/checkout/sections/checkout-empty-cart-section"
import { CheckoutFeedbackSection } from "@/components/checkout/sections/checkout-feedback-section"
import { CheckoutStepsSection } from "@/components/checkout/sections/checkout-steps-section"
import { useCheckoutController } from "@/components/checkout/use-checkout-controller"
import { useCartStorefrontTexts } from "@/lib/storefront/use-cart-storefront-texts"
import { useCheckoutStorefrontTexts } from "@/lib/storefront/use-checkout-storefront-texts"

type CheckoutFlowProps = {
  activeStep: CheckoutStepSlug
}

export function CheckoutFlow({ activeStep }: CheckoutFlowProps) {
  const router = useRouter()
  const controller = useCheckoutController()
  const cartTexts = useCartStorefrontTexts()
  const checkoutTexts = useCheckoutStorefrontTexts()
  const checkoutStepTitles = {
    address: checkoutTexts.customerDetails,
    cart: cartTexts.title,
    "shipping-payment": checkoutTexts.shippingPayment,
    summary: checkoutTexts.summary,
  } satisfies Record<CheckoutStepId, string>
  const checkoutSteps = CHECKOUT_STEPS.map((step) => ({
    ...step,
    title: checkoutStepTitles[step.id],
  }))
  const requiredStep = resolveRequiredCheckoutStepSlug({
    hasItems: controller.hasItems,
    hasPayment: controller.hasPayment,
    hasShipping: controller.hasShipping,
    hasStoredAddress: controller.hasStoredAddress,
  })
  const redirectStep = requiredStep

  const canAccessStep = canAccessCheckoutStep({
    requestedStep: activeStep,
    hasItems: controller.hasItems,
    hasPayment: controller.hasPayment,
    hasShipping: controller.hasShipping,
    hasStoredAddress: controller.hasStoredAddress,
  })

  const isStepGateLoading =
    controller.cartQuery.isLoading || controller.cartQuery.isFetching
  const hasResolvedCart = typeof controller.cartQuery.cart !== "undefined"
  const shouldRedirectStep =
    hasResolvedCart &&
    !isStepGateLoading &&
    !canAccessStep &&
    !controller.completedOrderId &&
    redirectStep !== activeStep

  useEffect(() => {
    if (!shouldRedirectStep) {
      return
    }

    router.replace(resolveCheckoutStepHref(redirectStep))
  }, [redirectStep, router, shouldRedirectStep])

  if (shouldRedirectStep) {
    return <main className="mx-auto min-h-dvh w-full max-w-max-w" />
  }

  const activeStepIndex = resolveCheckoutStepIndexBySlug(activeStep)
  const checkoutStepIndex = controller.completedOrderId
    ? CHECKOUT_STEPS.length
    : activeStepIndex

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 pt-600 pb-850 font-rubik lg:px-550 xl:px-700">
      <CheckoutStepsSection
        checkoutStepIndex={checkoutStepIndex}
        completedAriaLabel={checkoutTexts.completedAria}
        steps={checkoutSteps}
      />

      <CheckoutFeedbackSection
        cartError={controller.cartQuery.error}
        checkoutError={controller.checkoutError}
      />

      {controller.completedOrderId ? (
        <CheckoutCompletedOrderSection
          completedOrderId={controller.completedOrderId}
        />
      ) : null}

      {controller.completedOrderId || controller.hasItems ? null : (
        <CheckoutEmptyCartSection />
      )}

      {!controller.completedOrderId && controller.hasItems ? (
        <CheckoutStepContent activeStep={activeStep} controller={controller} />
      ) : null}
    </main>
  )
}
