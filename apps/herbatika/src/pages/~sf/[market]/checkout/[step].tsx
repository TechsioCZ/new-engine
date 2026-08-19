import type { GetServerSideProps } from "next"
import type { CheckoutStepSlug } from "@/components/checkout/checkout.constants"
import { CheckoutFlow } from "@/components/checkout-flow"
import { resolveCheckoutUiPage } from "@/lib/routing/private-flows/transactional-page.server"
import { notFoundResult, type PublicPageProps } from "@/lib/routing/public-page"
import type { CheckoutChildKey } from "@/lib/url/types"

type CheckoutValue = Readonly<{
  step: CheckoutChildKey
}>

type Props = PublicPageProps<CheckoutValue>

const UI_STEP = {
  contact: "udaje",
  shipping: "doprava-platba",
  payment: "doprava-platba",
  review: "suhrn",
} as const satisfies Record<
  Extract<CheckoutChildKey, "contact" | "shipping" | "payment" | "review">,
  CheckoutStepSlug
>

const isUiCheckoutStep = (
  step: CheckoutChildKey
): step is keyof typeof UI_STEP => step in UI_STEP

const isCheckoutChildKey = (value: unknown): value is CheckoutChildKey =>
  typeof value === "string" &&
  ["contact", "shipping", "payment", "review", "paymentReturn"].includes(value)

export const getServerSideProps = (async (context) => {
  const step = context.params?.step
  if (!isCheckoutChildKey(step)) {
    return notFoundResult(context)
  }
  if (isUiCheckoutStep(step)) {
    return await resolveCheckoutUiPage(context, {
      expectedRouteKey: `checkout.${step}`,
      requestedStep: step,
    })
  }
  return await notFoundResult(context)
}) satisfies GetServerSideProps<Props>

export default function CheckoutStepPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Checkout unavailable.</main>
  }
  return isUiCheckoutStep(page.value.step) ? (
    <CheckoutFlow activeStep={UI_STEP[page.value.step]} />
  ) : null
}
