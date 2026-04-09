"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { COUNTRY_SELECT_ITEMS } from "@/components/checkout/checkout.constants";
import type { CheckoutController } from "@/components/checkout/use-checkout-controller";
import { CheckoutAddressSection } from "./checkout-address-section";

type CheckoutDetailsStepController = Pick<
  CheckoutController,
  | "billingAddressForm"
  | "cartQuery"
  | "handleSaveAddress"
  | "isAuthenticated"
  | "isBusy"
  | "isCompanyPurchase"
  | "setUseSameAddress"
  | "shippingAddressForm"
  | "setIsCompanyPurchase"
  | "updateBillingAddressField"
  | "updateShippingAddressField"
  | "updateCartAddressMutation"
  | "useSameAddress"
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
      <form
        className="space-y-300"
        id={addressFormId}
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            const didSaveAddress = await controller.handleSaveAddress();
            if (didSaveAddress) {
              router.push(nextStepHref);
            }
          })();
        }}
      >
        <CheckoutAddressSection
          addressForm={controller.shippingAddressForm}
          countryItems={COUNTRY_SELECT_ITEMS}
          fieldPrefix="checkout-shipping"
          isAuthenticated={controller.isAuthenticated}
          isCompanyPurchase={controller.isCompanyPurchase}
          onIsCompanyPurchaseChange={
            controller.useSameAddress ? controller.setIsCompanyPurchase : undefined
          }
          onUpdateAddressField={controller.updateShippingAddressField}
          showCompanyFields={
            controller.useSameAddress && controller.isCompanyPurchase
          }
          showCompanyPurchaseToggle={controller.useSameAddress}
          showContactFields
          showCustomerNote
          showLoginPrompt
          title="Doručovacie údaje"
        />

        <div className="rounded-sm border border-border-primary bg-surface px-550 py-350">
          <FormCheckbox
            checked={controller.useSameAddress}
            label="Fakturačná adresa je rovnaká ako doručovacia"
            onCheckedChange={controller.setUseSameAddress}
            size="sm"
          />
        </div>

        {!controller.useSameAddress ? (
          <CheckoutAddressSection
            addressForm={controller.billingAddressForm}
            countryItems={COUNTRY_SELECT_ITEMS}
            fieldPrefix="checkout-billing"
            isCompanyPurchase={controller.isCompanyPurchase}
            onIsCompanyPurchaseChange={controller.setIsCompanyPurchase}
            onUpdateAddressField={controller.updateBillingAddressField}
            showCompanyFields={controller.isCompanyPurchase}
            showCompanyPurchaseToggle
            showContactFields={false}
            title="Fakturačné údaje"
          />
        ) : null}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-200">
        <LinkButton
          as={NextLink}
          href={backStepHref}
          size="lg"
          theme="outlined"
          icon="token-icon-chevron-left"
          variant="tertiary"
          className="w-full sm:min-w-950 sm:w-auto hover:button-bg-outlined-tertiary-hover"
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
