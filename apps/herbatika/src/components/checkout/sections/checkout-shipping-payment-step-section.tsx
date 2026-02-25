import type { ComponentProps } from "react";
import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { CheckoutPaymentSection } from "./checkout-payment-section";
import { CheckoutShippingSection } from "./checkout-shipping-section";

type CheckoutShippingPaymentStepSectionProps = {
  backStepHref: string;
  canContinue: boolean;
  nextStepHref: string;
  paymentProps: ComponentProps<typeof CheckoutPaymentSection>;
  shippingProps: ComponentProps<typeof CheckoutShippingSection>;
};

export function CheckoutShippingPaymentStepSection({
  backStepHref,
  canContinue,
  nextStepHref,
  paymentProps,
  shippingProps,
}: CheckoutShippingPaymentStepSectionProps) {
  return (
    <section className="space-y-300">
      <CheckoutShippingSection {...shippingProps} />
      <CheckoutPaymentSection {...paymentProps} />

      <div className="checkout-step-actions">
        <LinkButton
          as={NextLink}
          className="checkout-step-action-back"
          href={backStepHref}
          size="md"
          theme="outlined"
          variant="secondary"
        >
          Späť na košík
        </LinkButton>
        {canContinue ? (
          <LinkButton
            as={NextLink}
            className="checkout-step-action-next"
            href={nextStepHref}
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="md"
            variant="primary"
          >
            Pokračovať na vaše údaje
          </LinkButton>
        ) : (
          <Button className="checkout-step-action-next" disabled size="md" variant="primary">
            Pokračovať na vaše údaje
          </Button>
        )}
      </div>
    </section>
  );
}
