import { redirect } from "next/navigation"

import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils"
import { DEFAULT_CHECKOUT_STEP_SLUG } from "@/components/checkout/checkout.constants"
import { appHref } from "@/lib/routing"

export default function CheckoutPage() {
  redirect(appHref(resolveCheckoutStepHref(DEFAULT_CHECKOUT_STEP_SLUG)))
}
