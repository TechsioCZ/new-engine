import { redirect } from "next/navigation";
import {
  CHECKOUT_STEPS,
  DEFAULT_CHECKOUT_STEP_SLUG,
} from "@/components/checkout/checkout.constants";
import {
  isCheckoutStepSlug,
  resolveCheckoutStepHref,
} from "@/components/checkout/checkout-route.utils";
import { StorefrontCheckoutFlow } from "@/components/storefront-checkout-flow";

type CheckoutStepPageProps = {
  params: Promise<{
    step: string;
  }>;
};

export function generateStaticParams() {
  return CHECKOUT_STEPS.map((step) => ({
    step: step.slug,
  }));
}

export default async function CheckoutStepPage({
  params,
}: CheckoutStepPageProps) {
  const { step } = await params;

  if (!isCheckoutStepSlug(step)) {
    redirect(resolveCheckoutStepHref(DEFAULT_CHECKOUT_STEP_SLUG));
  }

  return <StorefrontCheckoutFlow activeStep={step} />;
}
