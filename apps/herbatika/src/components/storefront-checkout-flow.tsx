"use client";

import { COUNTRY_SELECT_ITEMS } from "@/components/checkout/checkout.constants";
import { useCheckoutController } from "@/components/checkout/use-checkout-controller";
import { CheckoutAddressSection } from "@/components/checkout/sections/checkout-address-section";
import { CheckoutCompleteSection } from "@/components/checkout/sections/checkout-complete-section";
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section";
import { CheckoutEmptyCartSection } from "@/components/checkout/sections/checkout-empty-cart-section";
import { CheckoutFeedbackSection } from "@/components/checkout/sections/checkout-feedback-section";
import { CheckoutOrderSummarySection } from "@/components/checkout/sections/checkout-order-summary-section";
import { CheckoutPaymentSection } from "@/components/checkout/sections/checkout-payment-section";
import { CheckoutShippingSection } from "@/components/checkout/sections/checkout-shipping-section";
import { CheckoutStepsSection } from "@/components/checkout/sections/checkout-steps-section";

export function StorefrontCheckoutFlow() {
  const controller = useCheckoutController();

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-500 px-400 py-550 lg:px-550">
      <header className="space-y-200">
        <h1 className="text-2xl font-semibold text-fg-primary">Dokončenie objednávky</h1>
        <p className="text-sm text-fg-secondary">
          Vyplňte údaje, zvoľte dopravu a platbu, potom potvrďte objednávku.
        </p>
      </header>

      <CheckoutStepsSection
        checkoutStepIndex={controller.checkoutStepIndex}
        steps={controller.checkoutSteps}
      />

      <CheckoutFeedbackSection
        cartError={controller.cartQuery.error}
        checkoutError={controller.checkoutError}
        checkoutMessage={controller.checkoutMessage}
      />

      {controller.completedOrderId ? (
        <CheckoutCompletedOrderSection completedOrderId={controller.completedOrderId} />
      ) : null}

      {!controller.completedOrderId && !controller.hasItems ? <CheckoutEmptyCartSection /> : null}

      {!controller.completedOrderId && controller.hasItems ? (
        <div className="grid gap-500 xl:grid-cols-3">
          <div className="space-y-350 xl:col-span-2">
            <CheckoutAddressSection
              acceptTermsConsent={controller.acceptTermsConsent}
              addressForm={controller.addressForm}
              countryItems={COUNTRY_SELECT_ITEMS}
              createAccountConsent={controller.createAccountConsent}
              hasStoredAddress={controller.hasStoredAddress}
              isBusy={controller.isBusy}
              isSavingAddress={controller.updateCartAddressMutation.isPending}
              onAcceptTermsConsentChange={controller.setAcceptTermsConsent}
              onCreateAccountConsentChange={controller.setCreateAccountConsent}
              onSaveAddress={controller.handleSaveAddress}
              onUpdateAddressField={controller.updateAddressField}
              ready={Boolean(controller.cartQuery.cart?.id)}
            />

            <CheckoutShippingSection
              currencyCode={controller.currencyCode}
              hasShipping={controller.hasShipping}
              isBusy={controller.isBusy}
              onSelectShipping={controller.handleSelectShipping}
              selectedShippingMethodId={controller.checkoutShippingQuery.selectedShippingMethodId}
              shippingOptions={controller.checkoutShippingQuery.shippingOptions}
              shippingPrices={controller.checkoutShippingQuery.shippingPrices}
            />

            <CheckoutPaymentSection
              canInitiatePayment={controller.checkoutPaymentQuery.canInitiatePayment}
              hasPayment={controller.hasPayment}
              isBusy={controller.isBusy}
              isInitiatingPayment={controller.checkoutPaymentQuery.isInitiatingPayment}
              onSelectPaymentProvider={controller.handleSelectPaymentProvider}
              paymentProviders={controller.checkoutPaymentQuery.paymentProviders}
            />

            <CheckoutCompleteSection
              acceptTermsConsent={controller.acceptTermsConsent}
              canCompleteOrder={controller.canCompleteOrder}
              hasPayment={controller.hasPayment}
              hasShipping={controller.hasShipping}
              hasStoredAddress={controller.hasStoredAddress}
              isCompletingOrder={controller.completeCartMutation.isPending}
              onCompleteOrder={controller.handleCompleteOrder}
            />
          </div>

          <aside className="space-y-300 xl:sticky xl:top-400 xl:self-start">
            <CheckoutOrderSummarySection
              cartItems={controller.cartItems}
              cartSubtotalAmount={controller.cartSubtotalAmount}
              cartTotalAmount={controller.cartTotalAmount}
              currencyCode={controller.currencyCode}
              hasPayment={controller.hasPayment}
              hasShipping={controller.hasShipping}
              selectedOptionName={controller.checkoutShippingQuery.selectedOption?.name ?? undefined}
              selectedShippingPrice={controller.selectedShippingPrice}
            />
          </aside>
        </div>
      ) : null}
    </main>
  );
}
