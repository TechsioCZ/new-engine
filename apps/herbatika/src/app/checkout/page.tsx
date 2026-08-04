import { redirect } from "next/navigation"

import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils"
import { DEFAULT_CHECKOUT_STEP_SLUG } from "@/components/checkout/checkout.constants"

export default function CheckoutPage() {
  redirect(resolveCheckoutStepHref(DEFAULT_CHECKOUT_STEP_SLUG))
}
