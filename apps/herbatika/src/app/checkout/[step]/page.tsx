import { redirect } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"

import { CheckoutFlow } from "@/components/checkout-flow"
import {
  isCheckoutStepSlug,
  resolveCheckoutStepHref,
} from "@/components/checkout/checkout-route.utils"
import { DEFAULT_CHECKOUT_STEP_SLUG } from "@/components/checkout/checkout.constants"
import { appHref } from "@/lib/routing"

interface CheckoutStepPageProps {
  params: Promise<{
    step: string
  }>
}

const CheckoutStepPageFallback = () => (
  <main className="mx-auto min-h-dvh w-full max-w-max-w" />
)

const CheckoutStepPageContent = async ({ params }: CheckoutStepPageProps) => {
  await connection()
  const { step } = await params

  if (!isCheckoutStepSlug(step)) {
    redirect(appHref(resolveCheckoutStepHref(DEFAULT_CHECKOUT_STEP_SLUG)))
  }

  return (
    <Suspense
      fallback={<main className="mx-auto min-h-dvh w-full max-w-max-w" />}
    >
      <CheckoutFlow activeStep={step} />
    </Suspense>
  )
}

const CheckoutStepPage = (props: CheckoutStepPageProps) => (
  <Suspense fallback={<CheckoutStepPageFallback />}>
    <CheckoutStepPageContent {...props} />
  </Suspense>
)

export default CheckoutStepPage
