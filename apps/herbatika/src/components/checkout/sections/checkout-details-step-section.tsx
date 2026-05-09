"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { COUNTRY_SELECT_ITEMS } from "@/components/checkout/checkout.constants";
import { resolveAddressFormsMatch } from "@/components/checkout/checkout-address.utils";
import type { CheckoutController } from "@/components/checkout/use-checkout-controller";
import { CheckoutAddressSection } from "./checkout-address-section";
import { CheckoutPickupPointDetailsSection } from "./checkout-pickup-point-details-section";

type CheckoutDetailsStepController = Pick<
  CheckoutController,
  | "cartQuery"
  | "checkoutDetailsForm"
  | "handleSaveAddress"
  | "isAuthenticated"
  | "isBusy"
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
  const checkoutDetailsValues = controller.checkoutDetailsForm.values;
  const hasCarrierPickupShipping =
    controller.checkoutDetailsForm.hasCarrierPickupShipping;
  const carrierPickupAddress =
    controller.checkoutDetailsForm.carrierPickupAddress;

  return (
    <section className="space-y-300">
      <form
        className="space-y-300"
        id={addressFormId}
        noValidate
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
        {hasCarrierPickupShipping && carrierPickupAddress ? (
          <CheckoutPickupPointDetailsSection
            checkoutDetailsForm={controller.checkoutDetailsForm}
            countryItems={COUNTRY_SELECT_ITEMS}
            isAuthenticated={controller.isAuthenticated}
            pickupAddress={carrierPickupAddress}
          />
        ) : (
          <>
            <CheckoutAddressSection
              checkoutDetailsForm={controller.checkoutDetailsForm}
              countryItems={COUNTRY_SELECT_ITEMS}
              fieldPrefix="checkout-shipping"
              isAuthenticated={controller.isAuthenticated}
              scope="shipping"
              showCompanyFields={
                checkoutDetailsValues.useSameAddress &&
                checkoutDetailsValues.isCompanyPurchase
              }
              showCompanyPurchaseToggle={checkoutDetailsValues.useSameAddress}
              showContactFields
              showCustomerNote
              showLoginPrompt
              title="Doručovacie údaje"
            />

            <div className="rounded-sm border border-border-primary bg-surface px-550 py-350">
              <controller.checkoutDetailsForm.form.AppField name="useSameAddress">
                {(field) => (
                  <field.CheckboxField
                    id="checkout-use-same-address"
                    label="Fakturačná adresa je rovnaká ako doručovacia"
                    onValueChange={(nextUseSameAddress) => {
                      controller.checkoutDetailsForm.trackUseSameAddressIntent(
                        nextUseSameAddress,
                      );

                      if (
                        !nextUseSameAddress &&
                        !controller.checkoutDetailsForm
                          .hasStoredBillingAddress &&
                        resolveAddressFormsMatch(
                          controller.checkoutDetailsForm.values.billing,
                          controller.checkoutDetailsForm.hydratedValues.billing,
                        )
                      ) {
                        controller.checkoutDetailsForm.copyShippingIntoBilling();
                      }
                    }}
                    size="sm"
                    validationMode="none"
                  />
                )}
              </controller.checkoutDetailsForm.form.AppField>
            </div>

            {!checkoutDetailsValues.useSameAddress ? (
              <CheckoutAddressSection
                checkoutDetailsForm={controller.checkoutDetailsForm}
                countryItems={COUNTRY_SELECT_ITEMS}
                fieldPrefix="checkout-billing"
                scope="billing"
                showCompanyFields={checkoutDetailsValues.isCompanyPurchase}
                showCompanyPurchaseToggle
                showContactFields={false}
                title="Fakturačné údaje"
              />
            ) : null}
          </>
        )}
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
          <span className="font-normal uppercase">Pokračovať na súhrn</span>
        </Button>
      </div>
    </section>
  );
}
