import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DEFAULT_CHECKOUT_STEP_SLUG } from "@/components/checkout/checkout.constants";
import {
  isCheckoutStepSlug,
  resolveCheckoutStepHref,
} from "@/components/checkout/checkout-route.utils";
import { CheckoutFlow } from "@/components/checkout-flow";

type CheckoutStepPageProps = {
  params: Promise<{
    step: string;
  }>;
};

function CheckoutStepPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
}

async function CheckoutStepPageContent({ params }: CheckoutStepPageProps) {
  await connection();
  const { step } = await params;

  if (!isCheckoutStepSlug(step)) {
    redirect(resolveCheckoutStepHref(DEFAULT_CHECKOUT_STEP_SLUG));
  }

  return (
    <Suspense
      fallback={<main className="mx-auto min-h-dvh w-full max-w-max-w" />}
    >
      <CheckoutFlow activeStep={step} />
    </Suspense>
  );
}

export default function CheckoutStepPage(props: CheckoutStepPageProps) {
  return (
    <Suspense fallback={<CheckoutStepPageFallback />}>
      <CheckoutStepPageContent {...props} />
    </Suspense>
  );
}
