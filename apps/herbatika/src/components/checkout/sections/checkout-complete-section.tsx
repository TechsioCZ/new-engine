import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import type { AddressFormState } from "@/components/checkout/checkout.constants"
import {
  resolveCountryLabel,
  resolvePaymentIcon,
  resolveShippingIcon,
} from "@/components/checkout/checkout-display.utils"
import { SupportingText } from "@/components/text/supporting-text"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

type CheckoutCompleteSectionProps = {
  canCompleteOrder: boolean
  cartTotalAmount: number
  cartTaxAmount: number
  cartTotalWithoutTaxAmount: number
  currencyCode: string
  detailsStepHref: string
  hasPayment: boolean
  hasShipping: boolean
  hasStoredAddress: boolean
  heurekaConsent: boolean
  isCompletingOrder: boolean
  marketingConsent: boolean
  onHeurekaConsentChange: (value: boolean) => void
  onMarketingConsentChange: (value: boolean) => void
  onCompleteOrder: () => Promise<void>
  paymentProviderId?: string
  paymentLabel?: string
  shippingAddressForm: AddressFormState
  shippingLabel?: string
  shippingOptionId?: string | null
  shippingStepHref: string
}

const summaryCardClassName =
  "rounded-sm border border-border-primary bg-surface space-y-300 p-300 sm:px-350"
const summaryEditLinkClassName =
  "gap-100 px-0 font-semibold text-fg-primary underline underline-offset-2 hover:text-primary"
const summaryInlineLinkClassName =
  "text-fg-primary underline underline-offset-2 hover:text-primary"

const hasTextValue = (value: string) => value.trim().length > 0

const resolveStreetValue = (form: AddressFormState) =>
  [form.address1.trim(), form.address2.trim()].filter(Boolean).join(", ")

type AddressRowLabels = {
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
  labels: AddressRowLabels
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
          { id: "company-name", label: labels.companyName, value: form.company },
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
    { id: "address", label: labels.address, value: resolveStreetValue(form) },
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

const resolveValue = (value: string) => (value.trim().length > 0 ? value : "—")

export function CheckoutCompleteSection({
  canCompleteOrder,
  cartTotalAmount,
  cartTaxAmount,
  cartTotalWithoutTaxAmount,
  currencyCode,
  detailsStepHref,
  hasPayment,
  hasShipping,
  hasStoredAddress,
  heurekaConsent,
  isCompletingOrder,
  marketingConsent,
  onHeurekaConsentChange,
  onMarketingConsentChange,
  onCompleteOrder,
  paymentProviderId,
  paymentLabel,
  shippingAddressForm,
  shippingLabel,
  shippingOptionId,
  shippingStepHref,
}: CheckoutCompleteSectionProps) {
  const tCart = useTranslations("cart")
  const tCheckout = useTranslations("checkout")
  const tForm = useTranslations("form")
  const marketContext = useMarketContext()
  const shippingAddressRows = resolveAddressRows(
    shippingAddressForm,
    marketContext.locale,
    {
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
    }
  )
  const shippingSummaryLabel = hasShipping
    ? (shippingLabel ?? tCheckout("selected_shipping"))
    : tCheckout("shipping_not_selected")
  const paymentSummaryLabel = hasPayment
    ? (paymentLabel ?? tCheckout("selected_payment"))
    : tCheckout("payment_not_selected")

  return (
    <section className="space-y-300 font-inter">
      <h2 className="font-medium font-rubik text-fg-primary text-xl">
        {tCheckout("order_summary")}
      </h2>

      <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-400 sm:p-550">
        <div className="flex items-start justify-between gap-200 border-border-secondary border-b pb-250">
          <p className="mt-200 font-medium text-fg-primary text-sm">
            {tCart("total_incl_tax")}
          </p>
          <div className="space-y-200 text-right">
            <p className="font-bold font-rubik text-2xl text-fg-primary">
              {formatCurrencyAmount(cartTotalAmount, currencyCode)}
            </p>
            <SupportingText className="text-fg-secondary">
              {`${tCheckout("total_excl_tax")}: ${formatCurrencyAmount(cartTotalWithoutTaxAmount, currencyCode)}`}
            </SupportingText>
            <SupportingText className="text-fg-secondary">
              {`${tCart("tax")}: ${formatCurrencyAmount(cartTaxAmount, currencyCode)}`}
            </SupportingText>
          </div>
        </div>

        <div className="space-y-100 px-150">
          <FormCheckbox
            checked={marketingConsent}
            label={tCheckout("review_marketing_consent")}
            onCheckedChange={onMarketingConsentChange}
            size="sm"
          />
          <FormCheckbox
            checked={heurekaConsent}
            label={tCheckout("review_heureka_consent")}
            onCheckedChange={onHeurekaConsentChange}
            size="sm"
          />
        </div>

        <div className="space-y-200">
          <Button
            block
            className="font-rubik tracking-wide"
            disabled={!canCompleteOrder}
            icon="token-icon-chevron-right"
            iconPosition="right"
            isLoading={isCompletingOrder}
            onClick={() => {
              runDetachedPromise(onCompleteOrder())
            }}
            size="lg"
            type="button"
            uppercase
          >
            {tCheckout("complete_order")}
          </Button>

          <p className="mx-auto max-w-[42rem] text-center text-fg-secondary text-xs leading-relaxed">
            {tCheckout.rich("review_legal_confirmation", {
              privacy: (chunks) => (
                <NextLink
                  className={summaryInlineLinkClassName}
                  href="/#ochrana-osobnych-udajov"
                >
                  {chunks}
                </NextLink>
              ),
              terms: (chunks) => (
                <NextLink
                  className={summaryInlineLinkClassName}
                  href="/#obchodne-podmienky"
                >
                  {chunks}
                </NextLink>
              ),
            })}
          </p>
        </div>
      </section>

      <SummaryRecapCard
        editLabel={tCheckout("edit")}
        href={shippingStepHref}
        icon={resolveShippingIcon({
          id: shippingOptionId,
          name: shippingLabel,
        })}
        label={shippingSummaryLabel}
        tone={hasShipping ? "default" : "warning"}
      />

      <SummaryRecapCard
        editLabel={tCheckout("edit")}
        href={shippingStepHref}
        icon={resolvePaymentIcon(paymentProviderId ?? "")}
        label={paymentSummaryLabel}
        tone={hasPayment ? "default" : "warning"}
      />

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
            {shippingAddressRows.map((row) => (
              <div
                className="min-w-0 space-y-50 px-150 py-100"
                key={`shipping-${row.id}`}
              >
                <p className="text-fg-tertiary text-sm">{row.label}</p>
                <p className="text-fg-primary text-sm leading-relaxed [overflow-wrap:anywhere]">
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
    </section>
  )
}

function SummaryRecapCard({
  editLabel,
  href,
  icon,
  label,
  tone = "default",
}: {
  editLabel: string
  href: string
  icon: IconType
  label: string
  tone?: "default" | "warning"
}) {
  return (
    <div className={summaryCardClassName}>
      <div className="flex items-center justify-between gap-200">
        <div className="flex min-w-0 items-center gap-450">
          <span className="flex h-600 w-600 shrink-0 items-center justify-center text-fg-primary">
            <Icon icon={icon} size="lg" />
          </span>
          <p
            className={
              tone === "warning"
                ? "font-medium text-sm text-warning"
                : "font-medium text-fg-primary text-sm"
            }
          >
            {label}
          </p>
        </div>

        <LinkButton
          as={NextLink}
          className={summaryEditLinkClassName}
          href={href}
          icon="token-icon-pen"
          iconSize="lg"
          size="sm"
          theme="unstyled"
        >
          {editLabel}
        </LinkButton>
      </div>
    </div>
  )
}
