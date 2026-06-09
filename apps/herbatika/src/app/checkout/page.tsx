import { redirect } from "next/navigation";
import { DEFAULT_CHECKOUT_STEP_SLUG } from "@/components/checkout/checkout.constants";
import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils";

export default function CheckoutPage() {
  redirect(resolveCheckoutStepHref(DEFAULT_CHECKOUT_STEP_SLUG));
}
