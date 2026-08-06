"use client"

import { useTranslations } from "next-intl"
import { redirect, useRouter } from "next/navigation"

import {
  canAccessCheckoutStep,
  resolveCheckoutStepHref,
  resolveCheckoutStepIndexBySlug,
  resolveRequiredCheckoutStepSlug,
} from "@/components/checkout/checkout-route.utils"
import { CheckoutStepContent } from "@/components/checkout/checkout-step-content"
import { canNavigateToCheckoutStep } from "@/components/checkout/checkout-step-navigation"
import { CHECKOUT_STEPS } from "@/components/checkout/checkout.constants"
import type {
  CheckoutStepId,
  CheckoutStepSlug,
} from "@/components/checkout/checkout.constants"
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section"
import { CheckoutEmptyCartSection } from "@/components/checkout/sections/checkout-empty-cart-section"
import { CheckoutFeedbackSection } from "@/components/checkout/sections/checkout-feedback-section"
import { CheckoutStepsSection } from "@/components/checkout/sections/checkout-steps-section"
import { useCheckoutController } from "@/components/checkout/use-checkout-controller"
import { appHref } from "@/lib/routing"

interface CheckoutFlowProps {
  activeStep: CheckoutStepSlug
}

export const CheckoutFlow = ({ activeStep }: CheckoutFlowProps) => {
  const router = useRouter()
  const controller = useCheckoutController()
  const tCart = useTranslations("cart")
  const tCheckout = useTranslations("checkout")
  const checkoutStepTitles = {
    address: tCheckout("customer_details"),
    cart: tCart("title"),
    "shipping-payment": tCheckout("shipping_payment"),
    summary: tCheckout("summary"),
  } satisfies Record<CheckoutStepId, string>
  const requiredStep = resolveRequiredCheckoutStepSlug({
    hasItems: controller.hasItems,
    hasPayment: controller.hasPayment,
    hasShipping: controller.hasShipping,
    hasStoredAddress: controller.hasStoredAddress,
  })
  const redirectStep = requiredStep
  const { completedOrderId } = controller
  const isCheckoutComplete =
    completedOrderId !== null &&
    completedOrderId !== undefined &&
    completedOrderId !== ""

  const canAccessStep = canAccessCheckoutStep({
    hasItems: controller.hasItems,
    hasPayment: controller.hasPayment,
    hasShipping: controller.hasShipping,
    hasStoredAddress: controller.hasStoredAddress,
    requestedStep: activeStep,
  })

  const isStepGateLoading =
    controller.cartQuery.isLoading || controller.cartQuery.isFetching
  const hasResolvedCart = controller.cartQuery.cart !== undefined
  const canApplyStepGate = hasResolvedCart && !isStepGateLoading
  const isRequestedStepInvalid = !canAccessStep && redirectStep !== activeStep
  const shouldRedirectStep =
    canApplyStepGate && isRequestedStepInvalid && !isCheckoutComplete
  const activeStepIndex = resolveCheckoutStepIndexBySlug(activeStep)
  const highestAccessibleStepIndex =
    resolveCheckoutStepIndexBySlug(requiredStep)
  const checkoutSteps = CHECKOUT_STEPS.map((step, index) => ({
    ...step,
    disabled: !canNavigateToCheckoutStep({
      highestAccessibleStepIndex,
      isCheckoutComplete,
      stepCount: CHECKOUT_STEPS.length,
      targetStepIndex: index,
    }),
    title: checkoutStepTitles[step.id],
  }))

  const handleCheckoutStepChange = (targetStepIndex: number) => {
    const targetStep = checkoutSteps[targetStepIndex]
    if (targetStep === undefined || targetStep.disabled) {
      return
    }

    router.push(appHref(resolveCheckoutStepHref(targetStep.slug)))
  }

  if (shouldRedirectStep) {
    redirect(appHref(resolveCheckoutStepHref(redirectStep)))
  }

  const checkoutStepIndex = isCheckoutComplete
    ? CHECKOUT_STEPS.length
    : activeStepIndex

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 pt-600 pb-850 font-rubik lg:px-550 xl:px-700">
      <CheckoutStepsSection
        checkoutStepIndex={checkoutStepIndex}
        completedAriaLabel={tCheckout("completed_aria")}
        onStepChange={handleCheckoutStepChange}
        steps={checkoutSteps}
      />

      <CheckoutFeedbackSection
        cartError={controller.cartQuery.error}
        checkoutError={controller.checkoutError}
      />

      {isCheckoutComplete ? (
        <CheckoutCompletedOrderSection completedOrderId={completedOrderId} />
      ) : null}

      {isCheckoutComplete || controller.hasItems ? null : (
        <CheckoutEmptyCartSection />
      )}

      {!isCheckoutComplete && controller.hasItems ? (
        <CheckoutStepContent activeStep={activeStep} controller={controller} />
      ) : null}
    </main>
  )
}
