import { redirect } from "next/navigation"
import { DEFAULT_CHECKOUT_STEP_SLUG } from "@/components/checkout/checkout.constants"
import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"

export default async function CheckoutPage() {
  const { code: market } = await getMarketServerContext()
  redirect(resolveCheckoutStepHref(DEFAULT_CHECKOUT_STEP_SLUG, market))
}
