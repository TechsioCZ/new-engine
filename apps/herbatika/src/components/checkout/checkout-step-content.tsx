import type { HttpTypes } from "@medusajs/types";
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
import { CheckoutInlineProductsSection } from "./sections/checkout-inline-products-section";

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
  const selectedPaymentProviderId = controller.selectedPaymentProviderId;
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
      cartItemsWithoutTaxAmount={controller.cartItemsSubtotalAmount}
      cartTaxAmount={controller.cartTaxAmount}
      cartTotalAmount={controller.cartTotalAmount}
      currencyCode={controller.currencyCode}
      detailsFont={orderSummaryDetailsFont}
      paymentLabel={selectedPaymentLabel}
      shippingLabel={selectedShippingLabel}
      shippingAmount={controller.cartShippingSubtotalAmount}
    />
  );

  switch (activeStep) {
    case "kosik":
      return (
        <CheckoutStepLayout
          header={<h2 className="text-2xl col-span-full leading-tight font-inter font-semibold text-fg-primary">
         {`Váš košík (${controller.cartItems.length})`}
      </h2>}
          aside={
            <CheckoutCartSidebarSection
              cartItemsTotalAmount={controller.cartItemsSubtotalAmount}
              cartTaxAmount={controller.cartTaxAmount}
              cartTotalAmount={controller.cartTotalAmount}
              cartTotalWithoutTaxAmount={controller.cartTotalWithoutTaxAmount}
              currencyCode={controller.currencyCode}
              hasShipping={controller.hasShipping}
              nextStepHref={shippingStepHref}
              shippingAmount={controller.cartShippingSubtotalAmount}
              shippingLabel={selectedShippingLabel}
            />
          }
          cartItems={controller.cartItems}
        >
          <CheckoutCartStepSection
            cartId={controller.cartQuery.cart?.id}
            cartItems={controller.cartItems}
            cartItemsTotalAmount={controller.cartItemsTotalAmount}
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
            cartTaxAmount={controller.cartTaxAmount}
            cartTotalWithoutTaxAmount={controller.cartTotalWithoutTaxAmount}
            currencyCode={controller.currencyCode}
            detailsStepHref={detailsStepHref}
            hasPayment={controller.hasPayment}
            hasShipping={controller.hasShipping}
            hasStoredAddress={controller.hasStoredAddress}
            heurekaConsent={controller.heurekaConsent}
            isCompletingOrder={
              controller.checkoutPaymentQuery.isInitiatingPayment ||
              controller.completeCheckoutMutation.isPending
            }
            marketingConsent={controller.marketingConsent}
            onHeurekaConsentChange={controller.setHeurekaConsent}
            onMarketingConsentChange={controller.setMarketingConsent}
            onCompleteOrder={controller.handleCompleteOrder}
            paymentProviderId={selectedPaymentProviderId ?? undefined}
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
  header,
  aside,
  children,
  cartItems,
}: {
  header?: ReactNode;
  aside: ReactNode;
  children: ReactNode;
  cartItems?: HttpTypes.StoreCartLineItem[];
}) {
  return (
    <div className="mx-auto max-w-max-w w-full space-y-900">
      <div className="grid w-full max-w-checkout mx-auto gap-x-700 gap-y-400 xl:grid-cols-12 xl:items-start">
        {header}
        <div className="space-y-350 xl:col-span-7">{children}</div>
        <aside className="space-y-300 xl:sticky xl:top-400 xl:col-span-5 xl:self-start">
          {aside}
        </aside>
      </div>
      {cartItems && <CheckoutInlineProductsSection cartItems={cartItems}/>}
    </div>
  );
}
