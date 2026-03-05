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
    <section className="space-y-400">
      <CheckoutShippingSection {...shippingProps} />
      <CheckoutPaymentSection {...paymentProps} />

      <div className="flex flex-col gap-250 pt-150 px-500 sm:flex-row sm:items-center">
        <LinkButton
          as={NextLink}
          href={backStepHref}
          size="md"
          theme="outlined"
          icon="token-icon-chevron-left"
          variant="secondary"
        >
          Späť na košík
        </LinkButton>
        {canContinue ? (
          <LinkButton
            as={NextLink}
            className="w-full sm:ml-auto sm:w-auto"
            href={nextStepHref}
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="md"
            variant="primary"
          >
            Pokračovať na vaše údaje
          </LinkButton>
        ) : (
          <Button className="w-full sm:ml-auto sm:w-auto" disabled size="md" variant="primary">
            Pokračovať na vaše údaje
          </Button>
        )}
      </div>
    </section>
  );
}
