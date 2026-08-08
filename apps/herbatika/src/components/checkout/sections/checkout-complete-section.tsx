import { useTranslations } from "next-intl"

import {
  resolvePaymentIcon,
  resolveShippingIcon,
} from "@/components/checkout/checkout-display.utils"

import { CheckoutCompleteAddressCard } from "./checkout-complete-address-card"
import { CheckoutCompleteOrderCard } from "./checkout-complete-order-card"
import type { CheckoutCompleteSectionProps } from "./checkout-complete-section.types"
import { CheckoutSummaryRecapCard } from "./checkout-summary-recap-card"

export const CheckoutCompleteSection = ({
  cartTotalAmount,
  cartTaxAmount,
  cartTotalWithoutTaxAmount,
  currencyCode,
  detailsStepHref,
  heurekaConsent,
  marketingConsent,
  onHeurekaConsentChange,
  onMarketingConsentChange,
  onCompleteOrder,
  paymentProviderId,
  paymentLabel,
  shippingAddressForm,
  shippingLabel,
  shippingOptionId,
  shippingStepHref,
  state,
}: CheckoutCompleteSectionProps) => {
  const tCheckout = useTranslations("checkout")
  const shippingSummaryLabel = state.hasShipping
    ? (shippingLabel ?? tCheckout("selected_shipping"))
    : tCheckout("shipping_not_selected")
  const paymentSummaryLabel = state.hasPayment
    ? (paymentLabel ?? tCheckout("selected_payment"))
    : tCheckout("payment_not_selected")

  return (
    <section className="space-y-300 font-inter">
      <h2 className="font-medium font-rubik text-fg-primary text-xl">
        {tCheckout("order_summary")}
      </h2>
      <CheckoutCompleteOrderCard
        canCompleteOrder={state.canCompleteOrder}
        cartTaxAmount={cartTaxAmount}
        cartTotalAmount={cartTotalAmount}
        cartTotalWithoutTaxAmount={cartTotalWithoutTaxAmount}
        currencyCode={currencyCode}
        heurekaConsent={heurekaConsent}
        isCompletingOrder={state.isCompletingOrder}
        marketingConsent={marketingConsent}
        onCompleteOrder={onCompleteOrder}
        onHeurekaConsentChange={onHeurekaConsentChange}
        onMarketingConsentChange={onMarketingConsentChange}
      />
      <CheckoutSummaryRecapCard
        editLabel={tCheckout("edit")}
        href={shippingStepHref}
        icon={resolveShippingIcon({
          ...(shippingOptionId === undefined ? {} : { id: shippingOptionId }),
          ...(shippingLabel === undefined ? {} : { name: shippingLabel }),
        })}
        label={shippingSummaryLabel}
        tone={state.hasShipping ? "default" : "warning"}
      />
      <CheckoutSummaryRecapCard
        editLabel={tCheckout("edit")}
        href={shippingStepHref}
        icon={resolvePaymentIcon(paymentProviderId ?? "")}
        label={paymentSummaryLabel}
        tone={state.hasPayment ? "default" : "warning"}
      />
      <CheckoutCompleteAddressCard
        detailsStepHref={detailsStepHref}
        hasStoredAddress={state.hasStoredAddress}
        shippingAddressForm={shippingAddressForm}
      />
    </section>
  )
}
