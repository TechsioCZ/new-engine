import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { useTranslations } from "next-intl"
import {
  type CarrierPickupAddress,
  formatCarrierPickupAddress,
} from "@/components/checkout/carrier-pickup-address.utils"
import { resolveCheckoutAddressFieldName } from "@/components/checkout/checkout-address.utils"
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form"
import { SupportingText } from "@/components/text/supporting-text"
import { useCheckoutFieldValidators } from "@/lib/storefront/use-checkout-field-validators"
import { CheckoutLoginPrompt } from "./checkout-login-prompt"
import { CheckoutPurchaseTypeToggle } from "./checkout-purchase-type-toggle"

type CheckoutPickupPointDetailsSectionProps = {
  checkoutDetailsForm: CheckoutDetailsFormController
  countryItems: SelectItem[]
  isAuthenticated: boolean
  pickupAddress: CarrierPickupAddress
}

export function CheckoutPickupPointDetailsSection({
  checkoutDetailsForm,
  countryItems,
  isAuthenticated,
  pickupAddress,
}: CheckoutPickupPointDetailsSectionProps) {
  const tCheckout = useTranslations("checkout")
  const isCompanyPurchase = checkoutDetailsForm.values.isCompanyPurchase
  const tForm = useTranslations("form")
  const fieldValidators = useCheckoutFieldValidators()

  return (
    <>
      <section className="space-y-150 rounded-sm border border-border-primary bg-surface p-550 font-rubik">
        <header>
          <h2 className="font-medium text-fg-primary text-xl">
            {tCheckout("pickup_delivery")}
          </h2>
        </header>
        <div className="space-y-50 rounded-sm bg-highlight p-300">
          <p className="font-medium text-fg-primary text-sm">
            {pickupAddress.label}
          </p>
          <SupportingText className="text-fg-secondary">
            {formatCarrierPickupAddress(pickupAddress)}
          </SupportingText>
        </div>
      </section>

      <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-550 font-rubik">
        <header>
          <h2 className="font-medium text-fg-primary text-xl">
            {tCheckout("contact_and_billing_details")}
          </h2>
        </header>

        {isAuthenticated ? null : <CheckoutLoginPrompt />}

        <div className="space-y-250 font-inter">
          <div className="grid gap-250 md:grid-cols-2">
            <checkoutDetailsForm.form.AppField
              name={resolveCheckoutAddressFieldName("shipping", "firstName")}
              validators={fieldValidators.shipping.firstName}
            >
              {(field) => (
                <field.TextField
                  id="checkout-pickup-first-name"
                  label={tForm("first_name")}
                  required
                  validationMode="blur"
                />
              )}
            </checkoutDetailsForm.form.AppField>

            <checkoutDetailsForm.form.AppField
              name={resolveCheckoutAddressFieldName("shipping", "lastName")}
              validators={fieldValidators.shipping.lastName}
            >
              {(field) => (
                <field.TextField
                  id="checkout-pickup-last-name"
                  label={tForm("last_name")}
                  required
                  validationMode="blur"
                />
              )}
            </checkoutDetailsForm.form.AppField>

            <checkoutDetailsForm.form.AppField
              name={resolveCheckoutAddressFieldName("shipping", "email")}
              validators={fieldValidators.shipping.email}
            >
              {(field) => (
                <field.TextField
                  autoComplete="email"
                  id="checkout-pickup-email"
                  label={tForm("email")}
                  required
                  type="email"
                  validationMode="blur"
                />
              )}
            </checkoutDetailsForm.form.AppField>

            <checkoutDetailsForm.form.AppField
              name={resolveCheckoutAddressFieldName("shipping", "phone")}
              validators={fieldValidators.shipping.phone}
            >
              {(field) => (
                <field.PhoneField
                  id="checkout-pickup-phone"
                  label={tForm("phone")}
                  required
                  validationMode="blur"
                />
              )}
            </checkoutDetailsForm.form.AppField>
          </div>

          <CheckoutPurchaseTypeToggle
            companyLabel={tCheckout("company_purchase")}
            groupLabel={tCheckout("purchase_type")}
            id="checkout-pickup-purchase-type"
            isCompanyPurchase={isCompanyPurchase}
            onValueChange={checkoutDetailsForm.setCompanyPurchase}
            privateLabel={tCheckout("private_purchase")}
          />

          <div className="grid gap-250 md:grid-cols-2">
            {isCompanyPurchase ? (
              <>
                <div className="md:col-span-2">
                  <checkoutDetailsForm.form.AppField
                    name={resolveCheckoutAddressFieldName("billing", "company")}
                    validators={fieldValidators.billing.company}
                  >
                    {(field) => (
                      <field.TextField
                        id="checkout-pickup-company"
                        label={tForm("company_name")}
                        required
                        validationMode="blur"
                      />
                    )}
                  </checkoutDetailsForm.form.AppField>
                </div>

                <div className="grid gap-250 md:col-span-2 md:grid-cols-3">
                  <checkoutDetailsForm.form.AppField
                    name={resolveCheckoutAddressFieldName(
                      "billing",
                      "companyId"
                    )}
                    validators={fieldValidators.billing.companyId}
                  >
                    {(field) => (
                      <field.TextField
                        id="checkout-pickup-company-id"
                        label={tForm("company_id")}
                        required
                        validationMode="blur"
                      />
                    )}
                  </checkoutDetailsForm.form.AppField>

                  <checkoutDetailsForm.form.AppField
                    name={resolveCheckoutAddressFieldName("billing", "taxId")}
                    validators={fieldValidators.billing.taxId}
                  >
                    {(field) => (
                      <field.TextField
                        id="checkout-pickup-tax-id"
                        label={tForm("tax_id")}
                        required
                        validationMode="blur"
                      />
                    )}
                  </checkoutDetailsForm.form.AppField>

                  <checkoutDetailsForm.form.AppField
                    name={resolveCheckoutAddressFieldName("billing", "vatId")}
                  >
                    {(field) => (
                      <field.TextField
                        id="checkout-pickup-vat-id"
                        label={tForm("vat_id")}
                        validationMode="blur"
                      />
                    )}
                  </checkoutDetailsForm.form.AppField>
                </div>
              </>
            ) : null}

            <checkoutDetailsForm.form.AppField
              name={resolveCheckoutAddressFieldName("billing", "countryCode")}
              validators={fieldValidators.billing.countryCode}
            >
              {(field) => (
                <field.SelectField
                  id="checkout-pickup-billing-country"
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
              name={resolveCheckoutAddressFieldName("billing", "address1")}
              validators={fieldValidators.billing.address1}
            >
              {(field) => (
                <field.TextField
                  id="checkout-pickup-billing-address-1"
                  label={tForm("address")}
                  required
                  validationMode="blur"
                />
              )}
            </checkoutDetailsForm.form.AppField>

            <checkoutDetailsForm.form.AppField
              name={resolveCheckoutAddressFieldName("billing", "city")}
              validators={fieldValidators.billing.city}
            >
              {(field) => (
                <field.TextField
                  id="checkout-pickup-billing-city"
                  label={tForm("city")}
                  required
                  validationMode="blur"
                />
              )}
            </checkoutDetailsForm.form.AppField>

            <checkoutDetailsForm.form.AppField
              name={resolveCheckoutAddressFieldName("billing", "postalCode")}
              validators={fieldValidators.billing.postalCode}
            >
              {(field) => (
                <field.TextField
                  id="checkout-pickup-billing-postal-code"
                  label={tForm("postal_code")}
                  required
                  validationMode="blur"
                />
              )}
            </checkoutDetailsForm.form.AppField>

            <div className="md:col-span-2">
              <checkoutDetailsForm.form.AppField
                name={resolveCheckoutAddressFieldName(
                  "shipping",
                  "customerNote"
                )}
              >
                {(field) => (
                  <field.TextareaField
                    className="min-h-14"
                    id="checkout-pickup-customer-note"
                    label={tForm("customer_note")}
                    resize="auto"
                    rows={3}
                    size="sm"
                    validationMode="none"
                  />
                )}
              </checkoutDetailsForm.form.AppField>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
