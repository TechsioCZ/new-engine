import type { ComponentProps } from "react";
import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { CheckoutAddressSection } from "./checkout-address-section";

type CheckoutDetailsStepSectionProps = {
  addressProps: ComponentProps<typeof CheckoutAddressSection>;
  backStepHref: string;
  canContinue: boolean;
  nextStepHref: string;
};

export function CheckoutDetailsStepSection({
  addressProps,
  backStepHref,
  canContinue,
  nextStepHref,
}: CheckoutDetailsStepSectionProps) {
  return (
    <section className="space-y-300">
      <CheckoutAddressSection {...addressProps} />

      <div className="checkout-step-actions">
        <LinkButton
          as={NextLink}
          className="checkout-step-action-back"
          href={backStepHref}
          size="md"
          theme="outlined"
          variant="secondary"
        >
          Späť na dopravu a platbu
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
            Pokračovať na súhrn
          </LinkButton>
        ) : (
          <Button className="checkout-step-action-next" disabled size="md" variant="primary">
            Pokračovať na súhrn
          </Button>
        )}
      </div>
    </section>
  );
}
