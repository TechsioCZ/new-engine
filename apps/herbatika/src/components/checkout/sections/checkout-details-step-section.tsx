"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { COUNTRY_SELECT_ITEMS } from "@/components/checkout/checkout.constants";
import type { CheckoutController } from "@/components/checkout/use-checkout-controller";
import { CheckoutAddressSection } from "./checkout-address-section";

type CheckoutDetailsStepController = Pick<
  CheckoutController,
  | "addressForm"
  | "cartQuery"
  | "createAccountConsent"
  | "handleSaveAddress"
  | "hasCustomerSupportNote"
  | "hasDifferentShippingAddress"
  | "isBusy"
  | "isCompanyPurchase"
  | "setCreateAccountConsent"
  | "setHasCustomerSupportNote"
  | "setHasDifferentShippingAddress"
  | "setIsCompanyPurchase"
  | "updateAddressField"
  | "updateCartAddressMutation"
>;

type CheckoutDetailsStepSectionProps = {
  backStepHref: string;
  controller: CheckoutDetailsStepController;
  nextStepHref: string;
};

export function CheckoutDetailsStepSection({
  backStepHref,
  controller,
  nextStepHref,
}: CheckoutDetailsStepSectionProps) {
  const router = useRouter();
  const addressFormId = "checkout-address-form";

  return (
    <section className="space-y-300">
      <CheckoutAddressSection
        addressForm={controller.addressForm}
        countryItems={COUNTRY_SELECT_ITEMS}
        createAccountConsent={controller.createAccountConsent}
        formId={addressFormId}
        hasCustomerSupportNote={controller.hasCustomerSupportNote}
        hasDifferentShippingAddress={controller.hasDifferentShippingAddress}
        isCompanyPurchase={controller.isCompanyPurchase}
        onAddressSaved={() => {
          router.push(nextStepHref);
        }}
        onCreateAccountConsentChange={controller.setCreateAccountConsent}
        onCustomerSupportNoteToggle={controller.setHasCustomerSupportNote}
        onDifferentShippingAddressChange={
          controller.setHasDifferentShippingAddress
        }
        onIsCompanyPurchaseChange={controller.setIsCompanyPurchase}
        onSaveAddress={controller.handleSaveAddress}
        onUpdateAddressField={controller.updateAddressField}
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
          disabled={controller.isBusy || !controller.cartQuery.cart?.id}
          form={addressFormId}
          icon="token-icon-chevron-right"
          iconPosition="right"
          isLoading={controller.updateCartAddressMutation.isPending}
          size="lg"
          type="submit"
        >
          <span className="font-normal">Pokračovať na súhrn</span>
        </Button>
      </div>
    </section>
  );
}
