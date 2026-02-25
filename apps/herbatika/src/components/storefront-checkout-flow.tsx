"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { CheckoutStepSlug } from "@/components/checkout/checkout.constants";
import { CheckoutStepContent } from "@/components/checkout/checkout-step-content";
import {
  canAccessCheckoutStep,
  resolveCheckoutStepHref,
  resolveCheckoutStepIndexBySlug,
  resolveRequiredCheckoutStepSlug,
} from "@/components/checkout/checkout-route.utils";
import { useCheckoutController } from "@/components/checkout/use-checkout-controller";
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section";
import { CheckoutEmptyCartSection } from "@/components/checkout/sections/checkout-empty-cart-section";
import { CheckoutFeedbackSection } from "@/components/checkout/sections/checkout-feedback-section";
import { CheckoutStepsSection } from "@/components/checkout/sections/checkout-steps-section";

type StorefrontCheckoutFlowProps = {
  activeStep: CheckoutStepSlug;
};

export function StorefrontCheckoutFlow({
  activeStep,
}: StorefrontCheckoutFlowProps) {
  const router = useRouter();
  const controller = useCheckoutController();
  const requiredStep = resolveRequiredCheckoutStepSlug({
    hasItems: controller.hasItems,
    hasPayment: controller.hasPayment,
    hasShipping: controller.hasShipping,
    hasStoredAddress: controller.hasStoredAddress,
  });
  const redirectStep =
    requiredStep === "kosik" && activeStep !== "kosik"
      ? "doprava-platba"
      : requiredStep;

  const canAccessStep = canAccessCheckoutStep({
    requestedStep: activeStep,
    hasItems: controller.hasItems,
    hasPayment: controller.hasPayment,
    hasShipping: controller.hasShipping,
    hasStoredAddress: controller.hasStoredAddress,
  });

  const isStepGateLoading =
    controller.cartQuery.isLoading || controller.cartQuery.isFetching;
  const hasResolvedCart = typeof controller.cartQuery.cart !== "undefined";
  const shouldRedirectStep =
    hasResolvedCart &&
    !isStepGateLoading &&
    !canAccessStep &&
    !controller.completedOrderId &&
    redirectStep !== activeStep;

  useEffect(() => {
    if (!shouldRedirectStep) {
      return;
    }

    router.replace(resolveCheckoutStepHref(redirectStep));
  }, [redirectStep, router, shouldRedirectStep]);

  if (shouldRedirectStep) {
    return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
  }

  const activeStepIndex = resolveCheckoutStepIndexBySlug(activeStep);

  return (
    <main className="checkout-main mx-auto flex w-full flex-col gap-750 px-400 pt-700 pb-850 lg:px-550">
      <CheckoutStepsSection
        checkoutStepIndex={activeStepIndex}
        steps={controller.checkoutSteps}
      />

      <CheckoutFeedbackSection
        cartError={controller.cartQuery.error}
        checkoutError={controller.checkoutError}
        checkoutMessage={controller.checkoutMessage}
      />

      {controller.completedOrderId ? (
        <CheckoutCompletedOrderSection completedOrderId={controller.completedOrderId} />
      ) : null}

      {!controller.completedOrderId && !controller.hasItems ? <CheckoutEmptyCartSection /> : null}

      {!controller.completedOrderId && controller.hasItems ? (
        <CheckoutStepContent activeStep={activeStep} controller={controller} />
      ) : null}
    </main>
  );
}
