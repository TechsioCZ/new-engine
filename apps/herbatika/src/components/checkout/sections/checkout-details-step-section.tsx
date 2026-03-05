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

      <div className="flex flex-wrap items-center justify-between gap-200">
        <LinkButton
          as={NextLink}
          href={backStepHref}
          size="md"
          theme="outlined"
          variant="secondary"
          icon="token-icon-chevron-left"
        >
          Späť na dopravu a platbu
        </LinkButton>
        {canContinue ? (
          <LinkButton
            as={NextLink}
            className="w-full sm:min-w-950 sm:w-auto"
            href={nextStepHref}
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="md"
            variant="primary"
          >
            Pokračovať na súhrn
          </LinkButton>
        ) : (
          <Button className="w-full sm:min-w-950 sm:w-auto" disabled size="md" variant="primary">
            Pokračovať na súhrn
          </Button>
        )}
      </div>
    </section>
  );
}
