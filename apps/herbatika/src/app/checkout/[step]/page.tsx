import { redirect } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import { DEFAULT_CHECKOUT_STEP_SLUG } from "@/components/checkout/checkout.constants"
import {
  isCheckoutStepSlug,
  resolveCheckoutStepHref,
} from "@/components/checkout/checkout-route.utils"
import { CheckoutFlow } from "@/components/checkout-flow"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"

type CheckoutStepPageProps = {
  params: Promise<{
    step: string
  }>
}

function CheckoutStepPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />
}

async function CheckoutStepPageContent({ params }: CheckoutStepPageProps) {
  await connection()
  const [{ step }, { code: market }] = await Promise.all([
    params,
    getMarketServerContext(),
  ])

  if (!isCheckoutStepSlug(step)) {
    redirect(resolveCheckoutStepHref(DEFAULT_CHECKOUT_STEP_SLUG, market))
  }

  return (
    <Suspense
      fallback={<main className="mx-auto min-h-dvh w-full max-w-max-w" />}
    >
      <CheckoutFlow activeStep={step} />
    </Suspense>
  )
}

export default function CheckoutStepPage(props: CheckoutStepPageProps) {
  return (
    <Suspense fallback={<CheckoutStepPageFallback />}>
      <CheckoutStepPageContent {...props} />
    </Suspense>
  )
}
