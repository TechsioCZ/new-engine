"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import NextLink from "next/link"
import { useRouter } from "next/navigation"
import { resolveAddressFormsMatch } from "@/components/checkout/checkout-address.utils"
import type { CheckoutController } from "@/components/checkout/use-checkout-controller"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { useCheckoutDetailsStorefrontTexts } from "@/lib/storefront/use-checkout-details-storefront-texts"
import { useCheckoutStorefrontTexts } from "@/lib/storefront/use-checkout-storefront-texts"
import { CheckoutAddressSection } from "./checkout-address-section"
import { CheckoutPickupPointDetailsSection } from "./checkout-pickup-point-details-section"

type CheckoutDetailsStepController = Pick<
  CheckoutController,
  | "cartQuery"
  | "checkoutDetailsForm"
  | "countryItems"
  | "handleSaveAddress"
  | "isAuthenticated"
  | "isBusy"
  | "updateCartAddressMutation"
>

type CheckoutDetailsStepSectionProps = {
  backStepHref: string
  controller: CheckoutDetailsStepController
  nextStepHref: string
}

export function CheckoutDetailsStepSection({
  backStepHref,
  controller,
  nextStepHref,
}: CheckoutDetailsStepSectionProps) {
  const router = useRouter()
  const checkoutDetailsTexts = useCheckoutDetailsStorefrontTexts()
  const checkoutTexts = useCheckoutStorefrontTexts()
  const addressFormId = "checkout-address-form"
  const checkoutDetailsValues = controller.checkoutDetailsForm.values
  const hasCarrierPickupShipping =
    controller.checkoutDetailsForm.hasCarrierPickupShipping
  const carrierPickupAddress =
    controller.checkoutDetailsForm.carrierPickupAddress
  const countryItems = controller.countryItems

  return (
    <section className="space-y-300">
      <header className="xl:pt-550">
        <h2 className="font-inter font-medium text-fg-primary text-xl leading-relaxed">
          {checkoutTexts.customerDetails}
        </h2>
      </header>

      <form
        className="space-y-300"
        id={addressFormId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          runDetachedPromise(
            (async () => {
              const didSaveAddress = await controller.handleSaveAddress()
              if (didSaveAddress) {
                router.push(nextStepHref)
              }
            })()
          )
        }}
      >
        {hasCarrierPickupShipping && carrierPickupAddress ? (
          <CheckoutPickupPointDetailsSection
            checkoutDetailsForm={controller.checkoutDetailsForm}
            countryItems={countryItems}
            isAuthenticated={controller.isAuthenticated}
            pickupAddress={carrierPickupAddress}
          />
        ) : (
          <>
            <CheckoutAddressSection
              checkoutDetailsForm={controller.checkoutDetailsForm}
              countryItems={countryItems}
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
              showRegistrationOptIn={!controller.isAuthenticated}
              showRequiredNote
            />

            <div className="rounded-sm border border-border-primary bg-surface px-550 py-350">
              <controller.checkoutDetailsForm.form.AppField name="useSameAddress">
                {(field) => (
                  <field.CheckboxField
                    id="checkout-use-same-address"
                    label={checkoutDetailsTexts.billingSameAsShipping}
                    onValueChange={(nextUseSameAddress) => {
                      controller.checkoutDetailsForm.trackUseSameAddressIntent(
                        nextUseSameAddress
                      )

                      if (
                        !(
                          nextUseSameAddress ||
                          controller.checkoutDetailsForm.hasStoredBillingAddress
                        ) &&
                        resolveAddressFormsMatch(
                          controller.checkoutDetailsForm.values.billing,
                          controller.checkoutDetailsForm.hydratedValues.billing
                        )
                      ) {
                        controller.checkoutDetailsForm.copyShippingIntoBilling()
                      }
                    }}
                    size="sm"
                    validationMode="none"
                  />
                )}
              </controller.checkoutDetailsForm.form.AppField>
            </div>

            {checkoutDetailsValues.useSameAddress ? null : (
              <CheckoutAddressSection
                checkoutDetailsForm={controller.checkoutDetailsForm}
                countryItems={countryItems}
                fieldPrefix="checkout-billing"
                scope="billing"
                showCompanyFields={checkoutDetailsValues.isCompanyPurchase}
                showCompanyPurchaseToggle
                showContactFields={false}
                title={checkoutDetailsTexts.billingDetails}
              />
            )}
          </>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-200">
        <LinkButton
          as={NextLink}
          className="hover:button-bg-outlined-tertiary-hover w-full sm:w-auto sm:min-w-950"
          href={backStepHref}
          icon="token-icon-chevron-left"
          size="lg"
          theme="outlined"
          variant="tertiary"
        >
          <span className="font-normal">
            {checkoutTexts.backToShippingPayment}
          </span>
        </LinkButton>
        <Button
          className="w-full sm:w-auto sm:min-w-950"
          disabled={controller.isBusy || !controller.cartQuery.cart?.id}
          form={addressFormId}
          icon="token-icon-chevron-right"
          iconPosition="right"
          isLoading={controller.updateCartAddressMutation.isPending}
          size="lg"
          type="submit"
        >
          <span className="font-normal uppercase">
            {checkoutTexts.continueToSummary}
          </span>
        </Button>
      </div>
    </section>
  )
}
