import type { CheckoutStepSlug } from "@/components/checkout/checkout.constants";
import { COUNTRY_SELECT_ITEMS } from "@/components/checkout/checkout.constants";
import {
  resolvePaymentSummaryLabel,
  resolveSelectedPaymentProviderId,
} from "@/components/checkout/checkout-display.utils";
import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils";
import { CheckoutCartSidebarSection } from "@/components/checkout/sections/checkout-cart-sidebar-section";
import { CheckoutCartStepSection } from "@/components/checkout/sections/checkout-cart-step-section";
import { CheckoutCompleteSection } from "@/components/checkout/sections/checkout-complete-section";
import { CheckoutDetailsStepSection } from "@/components/checkout/sections/checkout-details-step-section";
import { CheckoutOrderSummarySection } from "@/components/checkout/sections/checkout-order-summary-section";
import { CheckoutShippingPaymentStepSection } from "@/components/checkout/sections/checkout-shipping-payment-step-section";
import type { CheckoutController } from "@/components/checkout/use-checkout-controller";

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
  const selectedPaymentLabel =
    typeof selectedPaymentProviderId === "string" &&
    selectedPaymentProviderId.length > 0
      ? resolvePaymentSummaryLabel(selectedPaymentProviderId)
      : undefined;
  const orderSummaryDetailsFont = activeStep === "kosik" ? "rubik" : "inter";
  const stepLayoutClassName =
    "grid w-full gap-700 xl:grid-cols-12 xl:items-start";
  const stepMainClassName = "space-y-350 xl:col-span-7";
  const stepAsideClassName =
    "space-y-300 xl:col-span-5 xl:sticky xl:top-400 xl:self-start";

  const orderSummarySection = (
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
      selectedOptionName={
        controller.checkoutShippingQuery.selectedOption?.name ?? undefined
      }
      selectedShippingPrice={controller.selectedShippingPrice}
    />
  );

  if (activeStep === "kosik") {
    return (
      <div className={stepLayoutClassName}>
        <div className={stepMainClassName}>
          <CheckoutCartStepSection
            cartId={controller.cartQuery.cart?.id}
            cartItems={controller.cartItems}
            cartSubtotalAmount={controller.cartSubtotalAmount}
            currencyCode={controller.currencyCode}
          />
        </div>
        <aside className={stepAsideClassName}>
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
      <div className={stepLayoutClassName}>
        <div className={stepMainClassName}>
          <CheckoutShippingPaymentStepSection
            backStepHref={cartStepHref}
            canContinue={controller.hasShipping && controller.hasPayment}
            nextStepHref={detailsStepHref}
            paymentProps={{
              canInitiatePayment:
                controller.checkoutPaymentQuery.canInitiatePayment,
              isBusy: controller.isBusy,
              isInitiatingPayment:
                controller.checkoutPaymentQuery.isInitiatingPayment,
              onSelectPaymentProvider: controller.handleSelectPaymentProvider,
              paymentProviders:
                controller.checkoutPaymentQuery.paymentProviders,
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
        <aside className={stepAsideClassName}>{orderSummarySection}</aside>
      </div>
    );
  }

  if (activeStep === "udaje") {
    return (
      <div className={stepLayoutClassName}>
        <div className={stepMainClassName}>
          <CheckoutDetailsStepSection
            addressProps={{
              addressForm: controller.addressForm,
              countryItems: COUNTRY_SELECT_ITEMS,
              createAccountConsent: controller.createAccountConsent,
              hasCustomerSupportNote: controller.hasCustomerSupportNote,
              hasDifferentShippingAddress:
                controller.hasDifferentShippingAddress,
              isCompanyPurchase: controller.isCompanyPurchase,
              onCreateAccountConsentChange: controller.setCreateAccountConsent,
              onCustomerSupportNoteToggle: controller.setHasCustomerSupportNote,
              onDifferentShippingAddressChange:
                controller.setHasDifferentShippingAddress,
              onIsCompanyPurchaseChange: controller.setIsCompanyPurchase,
              onSaveAddress: controller.handleSaveAddress,
              onUpdateAddressField: controller.updateAddressField,
            }}
            backStepHref={shippingStepHref}
            isBusy={controller.isBusy}
            isSavingAddress={controller.updateCartAddressMutation.isPending}
            nextStepHref={summaryStepHref}
            ready={Boolean(controller.cartQuery.cart?.id)}
          />
        </div>
        <aside className={stepAsideClassName}>{orderSummarySection}</aside>
      </div>
    );
  }

  return (
    <div className={stepLayoutClassName}>
      <div className={stepMainClassName}>
        <CheckoutCompleteSection
          addressForm={controller.addressForm}
          canCompleteOrder={controller.canCompleteOrder}
          cartTotalAmount={controller.cartTotalAmount}
          cartTotalWithoutTaxAmount={controller.cartTotalWithoutTaxAmount}
          currencyCode={controller.currencyCode}
          detailsStepHref={detailsStepHref}
          hasPayment={controller.hasPayment}
          hasShipping={controller.hasShipping}
          hasStoredAddress={controller.hasStoredAddress}
          heurekaConsent={controller.heurekaConsent}
          isCompletingOrder={controller.completeCartMutation.isPending}
          marketingConsent={controller.marketingConsent}
          onHeurekaConsentChange={controller.setHeurekaConsent}
          onMarketingConsentChange={controller.setMarketingConsent}
          onCompleteOrder={controller.handleCompleteOrder}
          paymentProviderId={selectedPaymentProviderId}
          paymentLabel={selectedPaymentLabel}
          shippingLabel={
            controller.checkoutShippingQuery.selectedOption?.name ?? undefined
          }
          shippingOptionId={
            controller.checkoutShippingQuery.selectedShippingMethodId
          }
          shippingStepHref={shippingStepHref}
        />
      </div>
      <aside className={stepAsideClassName}>{orderSummarySection}</aside>
    </div>
  );
}
