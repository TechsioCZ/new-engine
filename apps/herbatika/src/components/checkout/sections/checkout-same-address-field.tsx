import { useTranslations } from "next-intl"

import { resolveAddressFormsMatch } from "@/components/checkout/checkout-address.utils"
import type { CheckoutController } from "@/components/checkout/use-checkout-controller"

type CheckoutDetailsForm = CheckoutController["checkoutDetailsForm"]

export const CheckoutSameAddressField = ({
  checkoutDetailsForm,
}: {
  checkoutDetailsForm: CheckoutDetailsForm
}) => {
  const tCheckout = useTranslations("checkout")

  return (
    <div className="rounded-sm border border-border-primary bg-surface px-550 py-350">
      <checkoutDetailsForm.form.AppField name="useSameAddress">
        {(field) => (
          <field.CheckboxField
            id="checkout-use-same-address"
            label={tCheckout("billing_same_as_shipping")}
            onValueChange={(nextUseSameAddress) => {
              checkoutDetailsForm.trackUseSameAddressIntent(nextUseSameAddress)

              if (
                !(
                  nextUseSameAddress ||
                  checkoutDetailsForm.hasStoredBillingAddress
                ) &&
                resolveAddressFormsMatch(
                  checkoutDetailsForm.values.billing,
                  checkoutDetailsForm.hydratedValues.billing,
                )
              ) {
                checkoutDetailsForm.copyShippingIntoBilling()
              }
            }}
            size="sm"
            validationMode="none"
          />
        )}
      </checkoutDetailsForm.form.AppField>
    </div>
  )
}
