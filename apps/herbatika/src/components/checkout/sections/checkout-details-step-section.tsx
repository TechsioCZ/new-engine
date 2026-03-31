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
          size="lg"
          theme="outlined"
          icon="token-icon-chevron-left"
          variant="tertiary"
          className="hover:button-bg-outlined-tertiary-hover"
        >
          <span className="font-normal">Späť na dopravu a platbu</span>
        </LinkButton>
        {canContinue ? (
          <LinkButton
            as={NextLink}
            className="w-full sm:min-w-950 sm:w-auto"
            href={nextStepHref}
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="lg"
          >
            <span className="font-normal">Pokračovať na súhrn</span>
          </LinkButton>
        ) : (
          <Button className="w-full sm:min-w-950 sm:w-auto" disabled size="lg">
            <span className="font-normal">Pokračovať na súhrn</span>
          </Button>
        )}
      </div>
    </section>
  );
}
