import {
  type CheckoutAddressScope,
  resolveCheckoutAddressFieldName,
} from "@/components/checkout/checkout-address.utils"
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form"
import { checkoutFieldValidators } from "@/lib/forms/checkout/address-validators"

type CheckoutCompanyFieldsProps = {
  checkoutDetailsForm: CheckoutDetailsFormController
  fieldPrefix: string
  scope: CheckoutAddressScope
}

export function CheckoutCompanyFields({
  checkoutDetailsForm,
  fieldPrefix,
  scope,
}: CheckoutCompanyFieldsProps) {
  const validators = checkoutFieldValidators[scope]

  return (
    <>
      <div className="md:col-span-2">
        <checkoutDetailsForm.form.AppField
          name={resolveCheckoutAddressFieldName(scope, "company")}
          validators={validators.company}
        >
          {(field) => (
            <field.TextField
              id={`${fieldPrefix}-company`}
              label="Názov firmy"
              required
              validationMode="blur"
            />
          )}
        </checkoutDetailsForm.form.AppField>
      </div>

      <div className="grid gap-250 md:col-span-2 md:grid-cols-3">
        <checkoutDetailsForm.form.AppField
          name={resolveCheckoutAddressFieldName(scope, "companyId")}
          validators={validators.companyId}
        >
          {(field) => (
            <field.TextField
              id={`${fieldPrefix}-company-id`}
              label="IČO"
              required
              validationMode="blur"
            />
          )}
        </checkoutDetailsForm.form.AppField>
        <checkoutDetailsForm.form.AppField
          name={resolveCheckoutAddressFieldName(scope, "taxId")}
          validators={validators.taxId}
        >
          {(field) => (
            <field.TextField
              id={`${fieldPrefix}-tax-id`}
              label="DIČ"
              required
              validationMode="blur"
            />
          )}
        </checkoutDetailsForm.form.AppField>
        <checkoutDetailsForm.form.AppField
          name={resolveCheckoutAddressFieldName(scope, "vatId")}
        >
          {(field) => (
            <field.TextField
              id={`${fieldPrefix}-vat-id`}
              label="IČ DPH"
              validationMode="blur"
            />
          )}
        </checkoutDetailsForm.form.AppField>
      </div>
    </>
  )
}
