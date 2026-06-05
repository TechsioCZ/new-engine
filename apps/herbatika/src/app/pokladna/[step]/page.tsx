import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DEFAULT_CHECKOUT_STEP_SLUG } from "@/components/checkout/checkout.constants";
import { isCheckoutStepSlug } from "@/components/checkout/checkout-route.utils";
import { StorefrontCheckoutFlow } from "@/components/storefront-checkout-flow";
import { routes } from "@/lib/routes";

type CheckoutStepPageProps = PageProps<"/pokladna/[step]">;

function CheckoutStepPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
}

async function CheckoutStepPageContent({ params }: CheckoutStepPageProps) {
  await connection();
  const { step } = await params;

  if (!isCheckoutStepSlug(step)) {
    redirect(routes.checkout.step(DEFAULT_CHECKOUT_STEP_SLUG));
  }

  return (
    <Suspense
      fallback={<main className="mx-auto min-h-dvh w-full max-w-max-w" />}
    >
      <StorefrontCheckoutFlow activeStep={step} />
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
