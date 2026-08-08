import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { useTranslations } from "next-intl"

import { resolveCheckoutAddressFieldName } from "@/components/checkout/checkout-address.utils"
import type { CheckoutAddressScope } from "@/components/checkout/checkout-address.utils"
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form"
import { useCheckoutFieldValidators } from "@/lib/storefront/use-checkout-field-validators"

interface CheckoutAddressLocationFieldsProps {
  checkoutDetailsForm: CheckoutDetailsFormController
  countryItems: SelectItem[]
  fieldPrefix: string
  scope: CheckoutAddressScope
}

export const CheckoutAddressLocationFields = ({
  checkoutDetailsForm,
  countryItems,
  fieldPrefix,
  scope,
}: CheckoutAddressLocationFieldsProps) => {
  const tForm = useTranslations("form")
  const scopedValidators = useCheckoutFieldValidators()[scope]

  return (
    <>
      <checkoutDetailsForm.form.AppField
        name={resolveCheckoutAddressFieldName(scope, "countryCode")}
        validators={scopedValidators.countryCode}
      >
        {(field) => (
          <field.SelectField
            id={`${fieldPrefix}-country`}
            items={countryItems}
            label={tForm("country")}
            placeholder={tForm("country_placeholder")}
            readOnly
            required
            validationMode="blur"
          />
        )}
      </checkoutDetailsForm.form.AppField>

      <checkoutDetailsForm.form.AppField
        name={resolveCheckoutAddressFieldName(scope, "address1")}
        validators={scopedValidators.address1}
      >
        {(field) => (
          <field.TextField
            id={`${fieldPrefix}-address-1`}
            label={tForm("address")}
            required
            validationMode="blur"
          />
        )}
      </checkoutDetailsForm.form.AppField>

      <checkoutDetailsForm.form.AppField
        name={resolveCheckoutAddressFieldName(scope, "city")}
        validators={scopedValidators.city}
      >
        {(field) => (
          <field.TextField
            id={`${fieldPrefix}-city`}
            label={tForm("city")}
            required
            validationMode="blur"
          />
        )}
      </checkoutDetailsForm.form.AppField>

      <checkoutDetailsForm.form.AppField
        name={resolveCheckoutAddressFieldName(scope, "postalCode")}
        validators={scopedValidators.postalCode}
      >
        {(field) => (
          <field.TextField
            id={`${fieldPrefix}-postal-code`}
            label={tForm("postal_code")}
            required
            validationMode="blur"
          />
        )}
      </checkoutDetailsForm.form.AppField>
    </>
  )
}
