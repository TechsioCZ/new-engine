import { useTranslations } from "next-intl"

import { resolveCheckoutAddressFieldName } from "@/components/checkout/checkout-address.utils"
import type { CheckoutAddressScope } from "@/components/checkout/checkout-address.utils"
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form"

interface CheckoutCustomerNoteFieldProps {
  checkoutDetailsForm: CheckoutDetailsFormController
  className?: string
  fieldPrefix: string
  scope: CheckoutAddressScope
}

export const CheckoutCustomerNoteField = ({
  checkoutDetailsForm,
  className,
  fieldPrefix,
  scope,
}: CheckoutCustomerNoteFieldProps) => {
  const tForm = useTranslations("form")

  return (
    <checkoutDetailsForm.form.AppField
      name={resolveCheckoutAddressFieldName(scope, "customerNote")}
    >
      {(field) => (
        <field.TextareaField
          {...(className === undefined ? {} : { className })}
          id={`${fieldPrefix}-customer-note`}
          label={tForm("customer_note")}
          resize="auto"
          rows={3}
          size="sm"
          validationMode="none"
        />
      )}
    </checkoutDetailsForm.form.AppField>
  )
}

export const CheckoutRegistrationOptInField = ({
  checkoutDetailsForm,
  fieldPrefix,
}: Pick<
  CheckoutCustomerNoteFieldProps,
  "checkoutDetailsForm" | "fieldPrefix"
>) => {
  const tCheckout = useTranslations("checkout")

  return (
    <checkoutDetailsForm.form.AppField name="accountSetupRequested">
      {(field) => (
        <field.CheckboxField
          id={`${fieldPrefix}-registration-opt-in`}
          label={
            <>
              <span>{tCheckout("registration_opt_in")}</span>{" "}
              <span className="text-fg-secondary">
                {tCheckout("registration_info")}
              </span>
            </>
          }
          size="sm"
          validationMode="none"
        />
      )}
    </checkoutDetailsForm.form.AppField>
  )
}
