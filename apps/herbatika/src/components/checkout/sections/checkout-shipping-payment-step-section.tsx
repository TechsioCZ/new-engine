import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import type { CheckoutController } from "@/components/checkout/use-checkout-controller";
import { CheckoutPaymentSection } from "./checkout-payment-section";
import { CheckoutShippingSection } from "./checkout-shipping-section";

type CheckoutShippingPaymentStepController = Pick<
  CheckoutController,
  | "checkoutPaymentQuery"
  | "checkoutShippingQuery"
  | "currencyCode"
  | "handleSelectPaymentProvider"
  | "handleSelectShipping"
  | "hasPayment"
  | "hasShipping"
  | "isBusy"
>;

type CheckoutShippingPaymentStepSectionProps = {
  backStepHref: string;
  controller: CheckoutShippingPaymentStepController;
  nextStepHref: string;
  selectedPaymentProviderId?: ComponentProps<
    typeof CheckoutPaymentSection
  >["selectedPaymentProviderId"];
};

export function CheckoutShippingPaymentStepSection({
  backStepHref,
  controller,
  nextStepHref,
  selectedPaymentProviderId,
}: CheckoutShippingPaymentStepSectionProps) {
  return (
    <section className="space-y-400">
      <CheckoutShippingSection
        currencyCode={controller.currencyCode}
        hasShipping={controller.hasShipping}
        isBusy={controller.isBusy}
        onSelectShipping={controller.handleSelectShipping}
        selectedShippingMethodId={
          controller.checkoutShippingQuery.selectedShippingMethodId
        }
        shippingOptions={controller.checkoutShippingQuery.shippingOptions}
        shippingPrices={controller.checkoutShippingQuery.shippingPrices}
      />
      <CheckoutPaymentSection
        canInitiatePayment={controller.checkoutPaymentQuery.canInitiatePayment}
        isBusy={controller.isBusy}
        isInitiatingPayment={
          controller.checkoutPaymentQuery.isInitiatingPayment
        }
        onSelectPaymentProvider={controller.handleSelectPaymentProvider}
        paymentProviders={controller.checkoutPaymentQuery.paymentProviders}
        selectedPaymentProviderId={selectedPaymentProviderId}
      />

      <div className="flex flex-col gap-250 pt-150 px-500 sm:flex-row sm:items-center">
        <LinkButton
          as={NextLink}
          href={backStepHref}
          size="lg"
          theme="outlined"
          icon="token-icon-chevron-left"
          variant="tertiary"
          className="hover:button-bg-outlined-tertiary-hover"
        >
          <span className="font-normal">Späť na košík</span>
        </LinkButton>
        {controller.hasShipping && controller.hasPayment ? (
          <LinkButton
            as={NextLink}
            className="w-full sm:ml-auto sm:w-auto"
            href={nextStepHref}
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="lg"
          >
            <span className="font-normal">Pokračovať na vaše údaje</span>
          </LinkButton>
        ) : (
          <Button className="w-full sm:ml-auto sm:w-auto" disabled size="lg">
            <span className="font-normal">Pokračovať na vaše údaje</span>
          </Button>
        )}
      </div>
    </section>
  );
}
