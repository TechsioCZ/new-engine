import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { useTranslations } from "next-intl"

import { formatCarrierPickupAddress } from "@/components/checkout/carrier-pickup-address.utils"
import type { CarrierPickupAddress } from "@/components/checkout/carrier-pickup-address.utils"
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form"
import { SupportingText } from "@/components/text/supporting-text"

import { CheckoutAddressCompanyFields } from "./checkout-address-company-fields"
import { CheckoutCustomerNoteField } from "./checkout-address-extra-fields"
import { CheckoutAddressLocationFields } from "./checkout-address-location-fields"
import { CheckoutAddressPersonFields } from "./checkout-address-person-fields"
import { CheckoutLoginPrompt } from "./checkout-login-prompt"
import { CheckoutPurchaseTypeToggle } from "./checkout-purchase-type-toggle"

interface CheckoutPickupPointDetailsSectionProps {
  checkoutDetailsForm: CheckoutDetailsFormController
  countryItems: SelectItem[]
  isAuthenticated: boolean
  pickupAddress: CarrierPickupAddress
}

export const CheckoutPickupPointDetailsSection = ({
  checkoutDetailsForm,
  countryItems,
  isAuthenticated,
  pickupAddress,
}: CheckoutPickupPointDetailsSectionProps) => {
  const tCheckout = useTranslations("checkout")
  const { isCompanyPurchase } = checkoutDetailsForm.values
  const handleCompanyPurchaseChange = checkoutDetailsForm.setCompanyPurchase

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
            <CheckoutAddressPersonFields
              checkoutDetailsForm={checkoutDetailsForm}
              fieldPrefix="checkout-pickup"
              scope="shipping"
              showContactFields
            />
          </div>

          <CheckoutPurchaseTypeToggle
            companyLabel={tCheckout("company_purchase")}
            groupLabel={tCheckout("purchase_type")}
            id="checkout-pickup-purchase-type"
            isCompanyPurchase={isCompanyPurchase}
            onValueChange={handleCompanyPurchaseChange}
            privateLabel={tCheckout("private_purchase")}
          />

          <div className="grid gap-250 md:grid-cols-2">
            {isCompanyPurchase ? (
              <CheckoutAddressCompanyFields
                checkoutDetailsForm={checkoutDetailsForm}
                fieldPrefix="checkout-pickup"
                scope="billing"
              />
            ) : null}
            <CheckoutAddressLocationFields
              checkoutDetailsForm={checkoutDetailsForm}
              countryItems={countryItems}
              fieldPrefix="checkout-pickup-billing"
              scope="billing"
            />
            <div className="md:col-span-2">
              <CheckoutCustomerNoteField
                checkoutDetailsForm={checkoutDetailsForm}
                className="min-h-checkout-note"
                fieldPrefix="checkout-pickup"
                scope="shipping"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
