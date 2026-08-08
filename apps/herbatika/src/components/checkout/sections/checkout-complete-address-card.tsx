import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import { resolveCountryLabel } from "@/components/checkout/checkout-display.utils"
import type { AddressFormState } from "@/components/checkout/checkout.constants"
import { SupportingText } from "@/components/text/supporting-text"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

import {
  summaryCardClassName,
  summaryEditLinkClassName,
} from "./checkout-summary-recap-card"

const hasTextValue = (value: string) => value.trim().length > 0
const resolveValue = (value: string) => (hasTextValue(value) ? value : "—")

interface AddressRowLabels {
  address: string
  city: string
  companyId: string
  companyName: string
  country: string
  customerNote: string
  email: string
  firstName: string
  lastName: string
  phone: string
  postalCode: string
  taxId: string
  vatId: string
}

const resolveAddressRows = (
  form: AddressFormState,
  locale: string,
  labels: AddressRowLabels,
) => {
  const hasCompanyDetails = [
    form.company,
    form.companyId,
    form.taxId,
    form.vatId,
  ].some(hasTextValue)

  return [
    { id: "first-name", label: labels.firstName, value: form.firstName },
    { id: "last-name", label: labels.lastName, value: form.lastName },
    ...(hasCompanyDetails
      ? [
          {
            id: "company-name",
            label: labels.companyName,
            value: form.company,
          },
          { id: "company-id", label: labels.companyId, value: form.companyId },
          { id: "tax-id", label: labels.taxId, value: form.taxId },
          { id: "vat-id", label: labels.vatId, value: form.vatId },
        ]
      : []),
    { id: "email", label: labels.email, value: form.email },
    { id: "phone", label: labels.phone, value: form.phone },
    {
      id: "country",
      label: labels.country,
      value: resolveCountryLabel(form.countryCode, locale),
    },
    {
      id: "address",
      label: labels.address,
      value: [form.address1.trim(), form.address2.trim()]
        .filter(Boolean)
        .join(", "),
    },
    { id: "city", label: labels.city, value: form.city },
    { id: "postal-code", label: labels.postalCode, value: form.postalCode },
    ...(hasTextValue(form.customerNote)
      ? [
          {
            id: "customer-note",
            label: labels.customerNote,
            value: form.customerNote,
          },
        ]
      : []),
  ]
}

interface CheckoutCompleteAddressCardProps {
  detailsStepHref: string
  hasStoredAddress: boolean
  shippingAddressForm: AddressFormState
}

export const CheckoutCompleteAddressCard = ({
  detailsStepHref,
  hasStoredAddress,
  shippingAddressForm,
}: CheckoutCompleteAddressCardProps) => {
  const tCheckout = useTranslations("checkout")
  const tForm = useTranslations("form")
  const { locale } = useMarketContext()
  const rows = resolveAddressRows(shippingAddressForm, locale, {
    address: tForm("address"),
    city: tForm("city"),
    companyId: tForm("company_id"),
    companyName: tForm("company_name"),
    country: tForm("country"),
    customerNote: tCheckout("review_customer_note"),
    email: tForm("email"),
    firstName: tForm("first_name"),
    lastName: tForm("last_name"),
    phone: tForm("phone"),
    postalCode: tForm("postal_code"),
    taxId: tForm("tax_id"),
    vatId: tForm("vat_id"),
  })

  return (
    <section className={summaryCardClassName}>
      <div className="flex items-center justify-between gap-200">
        <p className="font-medium font-rubik text-fg-primary text-lg">
          {tCheckout("customer_details")}
        </p>
        <LinkButton
          as={NextLink}
          className={summaryEditLinkClassName}
          href={detailsStepHref}
          icon="token-icon-pen"
          iconSize="lg"
          size="sm"
          theme="unstyled"
        >
          {tCheckout("edit")}
        </LinkButton>
      </div>
      <div className="grid gap-300">
        <div className="grid grid-cols-2 gap-x-250 gap-y-150 sm:grid-cols-3">
          {rows.map((row) => (
            <div
              className="min-w-0 space-y-50 px-150 py-100"
              key={`shipping-${row.id}`}
            >
              <p className="text-fg-tertiary text-sm">{row.label}</p>
              <p className="text-fg-primary text-sm leading-relaxed overflow-wrap-anywhere">
                {resolveValue(row.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
      {hasStoredAddress ? null : (
        <SupportingText className="text-warning">
          {tCheckout("review_missing_required_details")}
        </SupportingText>
      )}
    </section>
  )
}
