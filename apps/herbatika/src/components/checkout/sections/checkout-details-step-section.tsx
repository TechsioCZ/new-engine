"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { CheckoutAddressSection } from "./checkout-address-section";

type CheckoutDetailsStepSectionProps = {
  addressProps: ComponentProps<typeof CheckoutAddressSection>;
  backStepHref: string;
  isBusy: boolean;
  isSavingAddress: boolean;
  nextStepHref: string;
  ready: boolean;
};

export function CheckoutDetailsStepSection({
  addressProps,
  backStepHref,
  isBusy,
  isSavingAddress,
  nextStepHref,
  ready,
}: CheckoutDetailsStepSectionProps) {
  const router = useRouter();
  const addressFormId = "checkout-address-form";

  return (
    <section className="space-y-300">
      <CheckoutAddressSection
        {...addressProps}
        formId={addressFormId}
        onAddressSaved={() => {
          router.push(nextStepHref);
        }}
      />

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
        <Button
          className="w-full sm:min-w-950 sm:w-auto"
          disabled={isBusy || !ready}
          form={addressFormId}
          icon="token-icon-chevron-right"
          iconPosition="right"
          isLoading={isSavingAddress}
          size="lg"
          type="submit"
        >
          <span className="font-normal">Pokračovať na súhrn</span>
        </Button>
      </div>
    </section>
  );
}
