import { useTranslations } from "next-intl"

import { resolveCheckoutAddressFieldName } from "@/components/checkout/checkout-address.utils"
import type { CheckoutAddressScope } from "@/components/checkout/checkout-address.utils"
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form"
import { useCheckoutFieldValidators } from "@/lib/storefront/use-checkout-field-validators"

interface CheckoutAddressCompanyFieldsProps {
  checkoutDetailsForm: CheckoutDetailsFormController
  fieldPrefix: string
  scope: CheckoutAddressScope
}

export const CheckoutAddressCompanyFields = ({
  checkoutDetailsForm,
  fieldPrefix,
  scope,
}: CheckoutAddressCompanyFieldsProps) => {
  const tForm = useTranslations("form")
  const scopedValidators = useCheckoutFieldValidators()[scope]

  return (
    <>
      <div className="md:col-span-2">
        <checkoutDetailsForm.form.AppField
          name={resolveCheckoutAddressFieldName(scope, "company")}
          validators={scopedValidators.company}
        >
          {(field) => (
            <field.TextField
              id={`${fieldPrefix}-company`}
              label={tForm("company_name")}
              required
              validationMode="blur"
            />
          )}
        </checkoutDetailsForm.form.AppField>
      </div>

      <div className="grid gap-250 md:col-span-2 md:grid-cols-3">
        <checkoutDetailsForm.form.AppField
          name={resolveCheckoutAddressFieldName(scope, "companyId")}
          validators={scopedValidators.companyId}
        >
          {(field) => (
            <field.TextField
              id={`${fieldPrefix}-company-id`}
              label={tForm("company_id")}
              required
              validationMode="blur"
            />
          )}
        </checkoutDetailsForm.form.AppField>

        <checkoutDetailsForm.form.AppField
          name={resolveCheckoutAddressFieldName(scope, "taxId")}
          validators={scopedValidators.taxId}
        >
          {(field) => (
            <field.TextField
              id={`${fieldPrefix}-tax-id`}
              label={tForm("tax_id")}
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
              label={tForm("vat_id")}
              validationMode="blur"
            />
          )}
        </checkoutDetailsForm.form.AppField>
      </div>
    </>
  )
}
