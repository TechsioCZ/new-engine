"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import {
  canAccessCheckoutStep,
  resolveCheckoutStepHref,
  resolveCheckoutStepIndexBySlug,
  resolveRequiredCheckoutStepSlug,
} from "@/components/checkout/checkout-route.utils"
import { CheckoutStepContent } from "@/components/checkout/checkout-step-content"
import { canNavigateToCheckoutStep } from "@/components/checkout/checkout-step-navigation"
import {
  CHECKOUT_STEPS,
  type CheckoutStepSlug,
} from "@/components/checkout/checkout.constants"
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section"
import { CheckoutEmptyCartSection } from "@/components/checkout/sections/checkout-empty-cart-section"
import { CheckoutFeedbackSection } from "@/components/checkout/sections/checkout-feedback-section"
import { CheckoutStepsSection } from "@/components/checkout/sections/checkout-steps-section"
import { useCheckoutController } from "@/components/checkout/use-checkout-controller"
import { appHref } from "@/lib/routing"

type CheckoutFlowProps = {
  activeStep: CheckoutStepSlug
}

export function CheckoutFlow({ activeStep }: CheckoutFlowProps) {
  const router = useRouter()
  const controller = useCheckoutController()
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
  const activeStepIndex = resolveCheckoutStepIndexBySlug(activeStep)
  const highestAccessibleStepIndex =
    resolveCheckoutStepIndexBySlug(requiredStep)
  const isCheckoutComplete = Boolean(controller.completedOrderId)
  const checkoutSteps = CHECKOUT_STEPS.map((step, index) => ({
    ...step,
    disabled: !canNavigateToCheckoutStep({
      highestAccessibleStepIndex,
      isCheckoutComplete,
      stepCount: CHECKOUT_STEPS.length,
      targetStepIndex: index,
    }),
  }))

  const handleCheckoutStepChange = (targetStepIndex: number) => {
    const targetStep = checkoutSteps[targetStepIndex]
    if (!targetStep || targetStep.disabled) {
      return
    }

    router.push(appHref(resolveCheckoutStepHref(targetStep.slug)))
  }

  useEffect(() => {
    if (!shouldRedirectStep) {
      return
    }

    router.replace(appHref(resolveCheckoutStepHref(redirectStep)))
  }, [redirectStep, router, shouldRedirectStep])

  if (shouldRedirectStep) {
    return <main className="mx-auto min-h-dvh w-full max-w-max-w" />
  }

  const checkoutStepIndex = isCheckoutComplete
    ? CHECKOUT_STEPS.length
    : activeStepIndex

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 pt-600 pb-850 font-rubik lg:px-550 xl:px-700">
      <CheckoutStepsSection
        checkoutStepIndex={checkoutStepIndex}
        onStepChange={handleCheckoutStepChange}
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
