import { useTranslations } from "next-intl"

import { resolveCheckoutAddressFieldName } from "@/components/checkout/checkout-address.utils"
import type { CheckoutAddressScope } from "@/components/checkout/checkout-address.utils"
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form"
import { useCheckoutFieldValidators } from "@/lib/storefront/use-checkout-field-validators"

interface CheckoutAddressPersonFieldsProps {
  checkoutDetailsForm: CheckoutDetailsFormController
  fieldPrefix: string
  scope: CheckoutAddressScope
  showContactFields: boolean
}

export const CheckoutAddressPersonFields = ({
  checkoutDetailsForm,
  fieldPrefix,
  scope,
  showContactFields,
}: CheckoutAddressPersonFieldsProps) => {
  const tForm = useTranslations("form")
  const fieldValidators = useCheckoutFieldValidators()
  const scopedValidators = fieldValidators[scope]

  return (
    <>
      <checkoutDetailsForm.form.AppField
        name={resolveCheckoutAddressFieldName(scope, "firstName")}
        validators={scopedValidators.firstName}
      >
        {(field) => (
          <field.TextField
            id={`${fieldPrefix}-first-name`}
            label={tForm("first_name")}
            required
            validationMode="blur"
          />
        )}
      </checkoutDetailsForm.form.AppField>

      <checkoutDetailsForm.form.AppField
        name={resolveCheckoutAddressFieldName(scope, "lastName")}
        validators={scopedValidators.lastName}
      >
        {(field) => (
          <field.TextField
            id={`${fieldPrefix}-last-name`}
            label={tForm("last_name")}
            required
            validationMode="blur"
          />
        )}
      </checkoutDetailsForm.form.AppField>

      {showContactFields ? (
        <>
          <checkoutDetailsForm.form.AppField
            name={resolveCheckoutAddressFieldName(scope, "email")}
            validators={fieldValidators.shipping.email}
          >
            {(field) => (
              <field.TextField
                autoComplete="email"
                id={`${fieldPrefix}-email`}
                label={tForm("email")}
                required
                type="email"
                validationMode="blur"
              />
            )}
          </checkoutDetailsForm.form.AppField>

          <checkoutDetailsForm.form.AppField
            name={resolveCheckoutAddressFieldName(scope, "phone")}
            validators={fieldValidators.shipping.phone}
          >
            {(field) => (
              <field.PhoneField
                id={`${fieldPrefix}-phone`}
                label={tForm("phone")}
                required
                validationMode="blur"
              />
            )}
          </checkoutDetailsForm.form.AppField>
        </>
      ) : null}
    </>
  )
}
