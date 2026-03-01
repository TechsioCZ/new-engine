import { COUNTRY_SELECT_ITEMS } from "@/components/checkout/checkout.constants";
import type { CheckoutStepSlug } from "@/components/checkout/checkout.constants";
import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils";
import type { CheckoutController } from "@/components/checkout/use-checkout-controller";
import { CheckoutCartSidebarSection } from "@/components/checkout/sections/checkout-cart-sidebar-section";
import { CheckoutCartStepSection } from "@/components/checkout/sections/checkout-cart-step-section";
import { CheckoutDetailsStepSection } from "@/components/checkout/sections/checkout-details-step-section";
import { CheckoutOrderSummarySection } from "@/components/checkout/sections/checkout-order-summary-section";
import { CheckoutShippingPaymentStepSection } from "@/components/checkout/sections/checkout-shipping-payment-step-section";
import { CheckoutSummaryStepSection } from "@/components/checkout/sections/checkout-summary-step-section";
import { resolveProviderLabel } from "@/components/checkout/checkout.utils";

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
  const selectedPaymentProviderId = controller.hasPayment
    ? (controller.checkoutPaymentQuery.paymentProviders[0]?.id ?? undefined)
    : undefined;
  const selectedPaymentLabel =
    typeof selectedPaymentProviderId === "string" && selectedPaymentProviderId.length > 0
      ? resolveProviderLabel(selectedPaymentProviderId)
      : undefined;
  const orderSummaryDetailsFont = activeStep === "kosik" ? "rubik" : "inter";

  const orderSummarySection = (
    <CheckoutOrderSummarySection
      cartItems={controller.cartItems}
      cartSubtotalAmount={controller.cartSubtotalAmount}
      cartTotalAmount={controller.cartTotalAmount}
      currencyCode={controller.currencyCode}
      detailsFont={orderSummaryDetailsFont}
      hasPayment={controller.hasPayment}
      hasShipping={controller.hasShipping}
      selectedOptionName={controller.checkoutShippingQuery.selectedOption?.name ?? undefined}
      selectedShippingPrice={controller.selectedShippingPrice}
    />
  );

  if (activeStep === "kosik") {
    return (
      <div className="checkout-step-grid">
        <div className="space-y-350">
          <CheckoutCartStepSection
            cartId={controller.cartQuery.cart?.id}
            cartItems={controller.cartItems}
            cartSubtotalAmount={controller.cartSubtotalAmount}
            currencyCode={controller.currencyCode}
          />
        </div>
        <aside className="space-y-300 xl:sticky xl:top-400 xl:self-start">
          <CheckoutCartSidebarSection
            cartSubtotalAmount={controller.cartSubtotalAmount}
            cartTotalAmount={controller.cartTotalAmount}
            cartTotalWithoutTaxAmount={controller.cartTotalWithoutTaxAmount}
            currencyCode={controller.currencyCode}
            nextStepHref={shippingStepHref}
          />
        </aside>
      </div>
    );
  }

  if (activeStep === "doprava-platba") {
    return (
      <div className="checkout-step-grid">
        <div className="space-y-350">
          <CheckoutShippingPaymentStepSection
            backStepHref={cartStepHref}
            canContinue={controller.hasShipping && controller.hasPayment}
            nextStepHref={detailsStepHref}
            paymentProps={{
              canInitiatePayment: controller.checkoutPaymentQuery.canInitiatePayment,
              hasPayment: controller.hasPayment,
              isBusy: controller.isBusy,
              isInitiatingPayment: controller.checkoutPaymentQuery.isInitiatingPayment,
              onSelectPaymentProvider: controller.handleSelectPaymentProvider,
              paymentProviders: controller.checkoutPaymentQuery.paymentProviders,
              selectedPaymentProviderId,
            }}
            shippingProps={{
              currencyCode: controller.currencyCode,
              hasShipping: controller.hasShipping,
              isBusy: controller.isBusy,
              onSelectShipping: controller.handleSelectShipping,
              selectedShippingMethodId:
                controller.checkoutShippingQuery.selectedShippingMethodId,
              shippingOptions: controller.checkoutShippingQuery.shippingOptions,
              shippingPrices: controller.checkoutShippingQuery.shippingPrices,
            }}
          />
        </div>
        <aside className="space-y-300 xl:sticky xl:top-400 xl:self-start">
          {orderSummarySection}
        </aside>
      </div>
    );
  }

  if (activeStep === "udaje") {
    return (
      <div className="checkout-step-grid">
        <div className="space-y-350">
          <CheckoutDetailsStepSection
            addressProps={{
              addressForm: controller.addressForm,
              countryItems: COUNTRY_SELECT_ITEMS,
              createAccountConsent: controller.createAccountConsent,
              hasCustomerSupportNote: controller.hasCustomerSupportNote,
              hasDifferentShippingAddress: controller.hasDifferentShippingAddress,
              hasStoredAddress: controller.hasStoredAddress,
              isCompanyPurchase: controller.isCompanyPurchase,
              isBusy: controller.isBusy,
              isSavingAddress: controller.updateCartAddressMutation.isPending,
              onCreateAccountConsentChange: controller.setCreateAccountConsent,
              onCustomerSupportNoteToggle: controller.setHasCustomerSupportNote,
              onDifferentShippingAddressChange:
                controller.setHasDifferentShippingAddress,
              onIsCompanyPurchaseChange: controller.setIsCompanyPurchase,
              onSaveAddress: controller.handleSaveAddress,
              onUpdateAddressField: controller.updateAddressField,
              ready: Boolean(controller.cartQuery.cart?.id),
            }}
            backStepHref={shippingStepHref}
            canContinue={controller.hasStoredAddress}
            nextStepHref={summaryStepHref}
          />
        </div>
        <aside className="space-y-300 xl:sticky xl:top-400 xl:self-start">
          {orderSummarySection}
        </aside>
      </div>
    );
  }

  return (
    <div className="checkout-step-grid">
      <div className="space-y-350">
        <CheckoutSummaryStepSection
          completeProps={{
            addressForm: controller.addressForm,
            canCompleteOrder: controller.canCompleteOrder,
            cartTotalAmount: controller.cartTotalAmount,
            cartTotalWithoutTaxAmount: controller.cartTotalWithoutTaxAmount,
            currencyCode: controller.currencyCode,
            detailsStepHref,
            hasPayment: controller.hasPayment,
            hasShipping: controller.hasShipping,
            hasStoredAddress: controller.hasStoredAddress,
            heurekaConsent: controller.heurekaConsent,
            isCompletingOrder: controller.completeCartMutation.isPending,
            marketingConsent: controller.marketingConsent,
            onHeurekaConsentChange: controller.setHeurekaConsent,
            onMarketingConsentChange: controller.setMarketingConsent,
            onCompleteOrder: controller.handleCompleteOrder,
            paymentLabel: selectedPaymentLabel,
            shippingLabel: controller.checkoutShippingQuery.selectedOption?.name ?? undefined,
            shippingStepHref,
          }}
        />
      </div>
      <aside className="space-y-300 xl:sticky xl:top-400 xl:self-start">
        {orderSummarySection}
      </aside>
    </div>
  );
}
