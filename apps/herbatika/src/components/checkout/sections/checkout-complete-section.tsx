import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import NextLink from "next/link"
import type { AddressFormState } from "@/components/checkout/checkout.constants"
import {
  resolveCountryLabel,
  resolvePaymentIcon,
  resolveShippingIcon,
} from "@/components/checkout/checkout-display.utils"
import { SupportingText } from "@/components/text/supporting-text"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { useCartStorefrontTexts } from "@/lib/storefront/use-cart-storefront-texts"
import { useCheckoutStorefrontTexts } from "@/lib/storefront/use-checkout-storefront-texts"

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

const resolveAddressRows = (form: AddressFormState) => {
  const hasCompanyDetails = [
    form.company,
    form.companyId,
    form.taxId,
    form.vatId,
  ].some(hasTextValue)

  return [
    { label: "Meno", value: form.firstName },
    { label: "Priezvisko", value: form.lastName },
    ...(hasCompanyDetails
      ? [
          { label: "Názov firmy", value: form.company },
          { label: "IČO", value: form.companyId },
          { label: "DIČ", value: form.taxId },
          { label: "IČ DPH", value: form.vatId },
        ]
      : []),
    { label: "E-mail", value: form.email },
    { label: "Telefón", value: form.phone },
    { label: "Krajina", value: resolveCountryLabel(form.countryCode) },
    { label: "Ulica a číslo domu", value: resolveStreetValue(form) },
    { label: "Mesto", value: form.city },
    { label: "PSČ", value: form.postalCode },
    ...(hasTextValue(form.customerNote)
      ? [{ label: "Poznámka", value: form.customerNote }]
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
  const cartTexts = useCartStorefrontTexts()
  const checkoutTexts = useCheckoutStorefrontTexts()
  const shippingAddressRows = resolveAddressRows(shippingAddressForm)
  const shippingSummaryLabel = hasShipping
    ? (shippingLabel ?? checkoutTexts.selectedShipping)
    : checkoutTexts.shippingNotSelected
  const paymentSummaryLabel = hasPayment
    ? (paymentLabel ?? checkoutTexts.selectedPayment)
    : checkoutTexts.paymentNotSelected

  return (
    <section className="space-y-300 font-inter">
      <h2 className="font-medium font-rubik text-fg-primary text-xl">
        {checkoutTexts.orderSummary}
      </h2>

      <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-400 sm:p-550">
        <div className="flex items-start justify-between gap-200 border-border-secondary border-b pb-250">
          <p className="mt-200 font-medium text-fg-primary text-sm">
            {cartTexts.totalInclTax}
          </p>
          <div className="space-y-200 text-right">
            <p className="font-bold font-rubik text-2xl text-fg-primary">
              {formatCurrencyAmount(cartTotalAmount, currencyCode)}
            </p>
            <SupportingText className="text-fg-secondary">
              {`${checkoutTexts.totalExclTax}: ${formatCurrencyAmount(cartTotalWithoutTaxAmount, currencyCode)}`}
            </SupportingText>
            <SupportingText className="text-fg-secondary">
              {`${cartTexts.tax}: ${formatCurrencyAmount(cartTaxAmount, currencyCode)}`}
            </SupportingText>
          </div>
        </div>

        <div className="space-y-100 px-150">
          <FormCheckbox
            checked={marketingConsent}
            label="Súhlasím so zasielaním marketingových informácií"
            onCheckedChange={onMarketingConsentChange}
            size="sm"
          />
          <FormCheckbox
            checked={heurekaConsent}
            label="Súhlasím so zaslaním dotazníka spokojnosti Heureka"
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
            {checkoutTexts.completeOrder}
          </Button>

          <p className="mx-auto max-w-[42rem] text-center text-fg-secondary text-xs leading-relaxed">
            Potvrdzujem, že som sa oboznámil s{" "}
            <NextLink
              className={summaryInlineLinkClassName}
              href="/#obchodne-podmienky"
            >
              obchodnými podmienkami
            </NextLink>
            , porozumel som ich obsahu a v celom rozsahu s nimi súhlasím.
            Oboznámil som sa so{" "}
            <NextLink
              className={summaryInlineLinkClassName}
              href="/#ochrana-osobnych-udajov"
            >
              zásadami ochrany osobných údajov
            </NextLink>
            .
          </p>
        </div>
      </section>

      <SummaryRecapCard
        editLabel={checkoutTexts.edit}
        href={shippingStepHref}
        icon={resolveShippingIcon({
          id: shippingOptionId,
          name: shippingLabel,
        })}
        label={shippingSummaryLabel}
        tone={hasShipping ? "default" : "warning"}
      />

      <SummaryRecapCard
        editLabel={checkoutTexts.edit}
        href={shippingStepHref}
        icon={resolvePaymentIcon(paymentProviderId ?? "")}
        label={paymentSummaryLabel}
        tone={hasPayment ? "default" : "warning"}
      />

      <section className={`${summaryCardClassName}`}>
        <div className="flex items-center justify-between gap-200">
          <p className="font-medium font-rubik text-fg-primary text-lg">
            {checkoutTexts.customerDetails}
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
            {checkoutTexts.edit}
          </LinkButton>
        </div>

        <div className="grid gap-300">
          <div className="grid grid-cols-2 gap-x-250 gap-y-150 sm:grid-cols-3">
            {shippingAddressRows.map((row) => (
              <div
                className="min-w-0 space-y-50 px-150 py-100"
                key={`shipping-${row.label}`}
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
            Niektoré povinné údaje ešte nie sú uložené.
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
    <div className={`${summaryCardClassName}`}>
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
