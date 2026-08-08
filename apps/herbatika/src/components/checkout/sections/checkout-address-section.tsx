import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { useTranslations } from "next-intl"

import type { CheckoutAddressScope } from "@/components/checkout/checkout-address.utils"
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form"

import { CheckoutAddressCompanyFields } from "./checkout-address-company-fields"
import {
  CheckoutCustomerNoteField,
  CheckoutRegistrationOptInField,
} from "./checkout-address-extra-fields"
import { CheckoutAddressLocationFields } from "./checkout-address-location-fields"
import { CheckoutAddressPersonFields } from "./checkout-address-person-fields"
import { CheckoutLoginPrompt } from "./checkout-login-prompt"
import { CheckoutPurchaseTypeToggle } from "./checkout-purchase-type-toggle"

interface CheckoutAddressSectionProps {
  checkoutDetailsForm: CheckoutDetailsFormController
  countryItems: SelectItem[]
  fieldPrefix: string
  options: {
    isAuthenticated: boolean
    showCompanyFields: boolean
    showCompanyPurchaseToggle: boolean
    showContactFields: boolean
    showCustomerNote: boolean
    showLoginPrompt: boolean
    showRegistrationOptIn: boolean
    showRequiredNote: boolean
  }
  scope: CheckoutAddressScope
  title?: string
}

export const CheckoutAddressSection = ({
  checkoutDetailsForm,
  countryItems,
  fieldPrefix,
  options,
  scope,
  title,
}: CheckoutAddressSectionProps) => {
  const tCheckout = useTranslations("checkout")
  const tForm = useTranslations("form")
  const handleCompanyPurchaseChange = checkoutDetailsForm.setCompanyPurchase

  return (
    <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-550 font-rubik">
      {title !== undefined && title.length > 0 ? (
        <header>
          <h2 className="font-medium text-fg-primary text-xl">{title}</h2>
        </header>
      ) : null}

      {options.showLoginPrompt && !options.isAuthenticated ? (
        <CheckoutLoginPrompt />
      ) : null}

      <div className="space-y-250 font-inter">
        {options.showCompanyPurchaseToggle || options.showRequiredNote ? (
          <div className="flex flex-wrap items-center justify-between gap-150">
            {options.showCompanyPurchaseToggle ? (
              <CheckoutPurchaseTypeToggle
                companyLabel={tCheckout("company_purchase")}
                groupLabel={tCheckout("purchase_type")}
                id={`${fieldPrefix}-purchase-type`}
                isCompanyPurchase={checkoutDetailsForm.values.isCompanyPurchase}
                onValueChange={handleCompanyPurchaseChange}
                privateLabel={tCheckout("private_purchase")}
              />
            ) : (
              <span aria-hidden="true" />
            )}

            {options.showRequiredNote ? (
              <p className="text-fg-secondary text-sm">
                <span className="text-label-fg-required">*</span>{" "}
                {tForm("required_fields")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-250 md:grid-cols-2">
          <CheckoutAddressPersonFields
            checkoutDetailsForm={checkoutDetailsForm}
            fieldPrefix={fieldPrefix}
            scope={scope}
            showContactFields={options.showContactFields}
          />
          {options.showCompanyFields ? (
            <CheckoutAddressCompanyFields
              checkoutDetailsForm={checkoutDetailsForm}
              fieldPrefix={fieldPrefix}
              scope={scope}
            />
          ) : null}
          <CheckoutAddressLocationFields
            checkoutDetailsForm={checkoutDetailsForm}
            countryItems={countryItems}
            fieldPrefix={fieldPrefix}
            scope={scope}
          />
          {options.showCustomerNote ? (
            <div className="md:col-span-2">
              <CheckoutCustomerNoteField
                checkoutDetailsForm={checkoutDetailsForm}
                fieldPrefix={fieldPrefix}
                scope={scope}
              />
            </div>
          ) : null}
          {options.showRegistrationOptIn ? (
            <div className="md:col-span-2">
              <CheckoutRegistrationOptInField
                checkoutDetailsForm={checkoutDetailsForm}
                fieldPrefix={fieldPrefix}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
