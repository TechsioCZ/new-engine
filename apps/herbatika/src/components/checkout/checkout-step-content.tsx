import type { ReactNode } from "react";
import type { CheckoutStepSlug } from "@/components/checkout/checkout.constants";
import { resolvePaymentSummaryLabel } from "@/components/checkout/checkout-display.utils";
import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils";
import { CheckoutCartSidebarSection } from "@/components/checkout/sections/checkout-cart-sidebar-section";
import { CheckoutCartStepSection } from "@/components/checkout/sections/checkout-cart-step-section";
import { CheckoutCompleteSection } from "@/components/checkout/sections/checkout-complete-section";
import { CheckoutDetailsStepSection } from "@/components/checkout/sections/checkout-details-step-section";
import { CheckoutOrderSummarySection } from "@/components/checkout/sections/checkout-order-summary-section";
import { CheckoutShippingPaymentStepSection } from "@/components/checkout/sections/checkout-shipping-payment-step-section";
import type { CheckoutController } from "@/components/checkout/use-checkout-controller";
import { resolveSelectedPaymentProviderId } from "@/lib/storefront/checkout";

type CheckoutStepContentProps = {
  activeStep: CheckoutStepSlug;
  controller: CheckoutController;
};

export function CheckoutStepContent({
  activeStep,
  controller,
}: CheckoutStepContentProps) {
  const cartStepHref = resolveCheckoutStepHref("kosik");
  const shippingStepHref = resolveCheckoutStepHref("doprava-platba");
  const detailsStepHref = resolveCheckoutStepHref("udaje");
  const summaryStepHref = resolveCheckoutStepHref("suhrn");
  const selectedPaymentProviderId = resolveSelectedPaymentProviderId(
    controller.cartQuery.cart,
  );
  const selectedShippingOption =
    controller.checkoutShippingQuery.selectedOption;
  const selectedShippingLabel = selectedShippingOption?.name ?? undefined;
  const selectedShippingOptionId =
    controller.checkoutShippingQuery.selectedShippingMethodId;
  const selectedPaymentLabel =
    typeof selectedPaymentProviderId === "string" &&
    selectedPaymentProviderId.length > 0
      ? resolvePaymentSummaryLabel(selectedPaymentProviderId)
      : undefined;
  const orderSummaryDetailsFont = activeStep === "kosik" ? "rubik" : "inter";
  const orderSummaryAside = (
    <CheckoutOrderSummarySection
      cartItems={controller.cartItems}
      cartSubtotalAmount={controller.cartSubtotalAmount}
      cartTotalAmount={controller.cartTotalAmount}
      cartTotalWithoutTaxAmount={controller.cartTotalWithoutTaxAmount}
      currencyCode={controller.currencyCode}
      detailsFont={orderSummaryDetailsFont}
      hasPayment={controller.hasPayment}
      hasShipping={controller.hasShipping}
      paymentLabel={selectedPaymentLabel}
      selectedOptionName={selectedShippingLabel}
      selectedShippingPrice={controller.selectedShippingPrice}
    />
  );

  switch (activeStep) {
    case "kosik":
      return (
        <CheckoutStepLayout
          aside={
            <CheckoutCartSidebarSection
              cartSubtotalAmount={controller.cartSubtotalAmount}
              cartTotalAmount={controller.cartTotalAmount}
              cartTotalWithoutTaxAmount={controller.cartTotalWithoutTaxAmount}
              currencyCode={controller.currencyCode}
              nextStepHref={shippingStepHref}
            />
          }
        >
          <CheckoutCartStepSection
            cartId={controller.cartQuery.cart?.id}
            cartItems={controller.cartItems}
            cartSubtotalAmount={controller.cartSubtotalAmount}
            currencyCode={controller.currencyCode}
          />
        </CheckoutStepLayout>
      );
    case "doprava-platba":
      return (
        <CheckoutStepLayout aside={orderSummaryAside}>
          <CheckoutShippingPaymentStepSection
            backStepHref={cartStepHref}
            controller={controller}
            nextStepHref={detailsStepHref}
            selectedPaymentProviderId={selectedPaymentProviderId}
          />
        </CheckoutStepLayout>
      );
    case "udaje":
      return (
        <CheckoutStepLayout aside={orderSummaryAside}>
          <CheckoutDetailsStepSection
            backStepHref={shippingStepHref}
            controller={controller}
            nextStepHref={summaryStepHref}
          />
        </CheckoutStepLayout>
      );
    default:
      return (
        <CheckoutStepLayout aside={orderSummaryAside}>
          <CheckoutCompleteSection
            billingAddressForm={controller.billingAddressForm}
            canCompleteOrder={controller.canCompleteOrder}
            cartTotalAmount={controller.cartTotalAmount}
            cartTotalWithoutTaxAmount={controller.cartTotalWithoutTaxAmount}
            currencyCode={controller.currencyCode}
            detailsStepHref={detailsStepHref}
            hasPayment={controller.hasPayment}
            hasShipping={controller.hasShipping}
            hasStoredAddress={controller.hasStoredAddress}
            heurekaConsent={controller.heurekaConsent}
            isCompletingOrder={controller.completeCheckoutMutation.isPending}
            marketingConsent={controller.marketingConsent}
            onHeurekaConsentChange={controller.setHeurekaConsent}
            onMarketingConsentChange={controller.setMarketingConsent}
            onCompleteOrder={controller.handleCompleteOrder}
            paymentProviderId={selectedPaymentProviderId}
            paymentLabel={selectedPaymentLabel}
            shippingAddressForm={controller.shippingAddressForm}
            shippingLabel={selectedShippingLabel}
            shippingOptionId={selectedShippingOptionId}
            shippingStepHref={shippingStepHref}
            useSameAddress={controller.useSameAddress}
          />
        </CheckoutStepLayout>
      );
  }
}

function CheckoutStepLayout({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid w-full gap-700 xl:grid-cols-12 xl:items-start">
      <div className="space-y-350 xl:col-span-7">{children}</div>
      <aside className="space-y-300 xl:sticky xl:top-400 xl:col-span-5 xl:self-start">
        {aside}
      </aside>
    </div>
  );
}
