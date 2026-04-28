import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import NextLink from "next/link";
import type { AddressFormState } from "@/components/checkout/checkout.constants";
import {
  resolveCountryLabel,
  resolvePaymentIcon,
  resolveShippingIcon,
} from "@/components/checkout/checkout-display.utils";
import { SupportingText } from "@/components/text/supporting-text";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";

type CheckoutCompleteSectionProps = {
  billingAddressForm: AddressFormState;
  canCompleteOrder: boolean;
  cartTotalAmount: number;
  cartTotalWithoutTaxAmount: number;
  currencyCode: string;
  detailsStepHref: string;
  hasPayment: boolean;
  hasShipping: boolean;
  hasStoredAddress: boolean;
  heurekaConsent: boolean;
  isCompletingOrder: boolean;
  marketingConsent: boolean;
  onHeurekaConsentChange: (value: boolean) => void;
  onMarketingConsentChange: (value: boolean) => void;
  onCompleteOrder: () => Promise<void>;
  paymentProviderId?: string;
  paymentLabel?: string;
  shippingAddressForm: AddressFormState;
  shippingLabel?: string;
  shippingOptionId?: string | null;
  shippingStepHref: string;
  useSameAddress: boolean;
};

const summaryCardClassName =
  "rounded-sm border border-border-primary bg-surface space-y-300 p-400 sm:p-550";
const summaryEditLinkClassName =
  "gap-100 px-0 font-semibold text-fg-primary underline underline-offset-2 hover:text-primary";
const summaryInlineLinkClassName =
  "text-fg-primary underline underline-offset-2 hover:text-primary";

const hasTextValue = (value: string) => {
  return value.trim().length > 0;
};

const resolveStreetValue = (form: AddressFormState) => {
  return [form.address1.trim(), form.address2.trim()]
    .filter(Boolean)
    .join(", ");
};

const resolveAddressRows = (form: AddressFormState) => {
  const hasCompanyDetails = [
    form.company,
    form.companyId,
    form.taxId,
    form.vatId,
  ].some(hasTextValue);

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
  ];
};

const resolveBillingAddressRows = (form: AddressFormState) => {
  const hasCompanyDetails = [
    form.company,
    form.companyId,
    form.taxId,
    form.vatId,
  ].some(hasTextValue);

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
    { label: "Krajina", value: resolveCountryLabel(form.countryCode) },
    { label: "Ulica a číslo domu", value: resolveStreetValue(form) },
    { label: "Mesto", value: form.city },
    { label: "PSČ", value: form.postalCode },
  ];
};

const resolveValue = (value: string) => {
  return value.trim().length > 0 ? value : "—";
};

export function CheckoutCompleteSection({
  billingAddressForm,
  canCompleteOrder,
  cartTotalAmount,
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
  useSameAddress,
}: CheckoutCompleteSectionProps) {
  const shippingAddressRows = resolveAddressRows(shippingAddressForm);
  const billingAddressRows = resolveBillingAddressRows(billingAddressForm);
  const shippingSummaryLabel = hasShipping
    ? (shippingLabel ?? "Zvolená doprava")
    : "Doprava nie je vybraná";
  const paymentSummaryLabel = hasPayment
    ? (paymentLabel ?? "Zvolená platba")
    : "Platba nie je vybraná";

  return (
    <section className="space-y-300 font-inter">
      <h2 className="font-rubik text-xl font-medium text-fg-primary">
        Súhrn objednávky
      </h2>

      <section className="rounded-sm border border-border-primary bg-surface space-y-300 p-400 sm:p-550">
        <div className="flex items-start justify-between gap-200 border-b border-border-secondary pb-250">
          <p className="text-sm font-medium mt-200 text-fg-primary">Spolu s DPH</p>
          <div className="text-right space-y-200">
            <p className="font-rubik text-2xl font-bold text-fg-primary">
              {formatCurrencyAmount(cartTotalAmount, currencyCode)}
            </p>
            <SupportingText className="text-fg-secondary">
              {`bez DPH: ${formatCurrencyAmount(cartTotalWithoutTaxAmount, currencyCode)}`}
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
              void onCompleteOrder();
            }}
            type="button"
            uppercase
            size="lg"
          >
            Dokončiť objednávku
          </Button>

          <p className="mx-auto max-w-[42rem] text-center text-xs leading-relaxed text-fg-secondary">
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
        href={shippingStepHref}
        icon={resolveShippingIcon({
          id: shippingOptionId,
          name: shippingLabel,
        })}
        label={shippingSummaryLabel}
        tone={hasShipping ? "default" : "warning"}
      />

      <SummaryRecapCard
        href={shippingStepHref}
        icon={resolvePaymentIcon(paymentProviderId ?? "")}
        label={paymentSummaryLabel}
        tone={hasPayment ? "default" : "warning"}
      />

      <section className={`${summaryCardClassName}`}>
        <div className="flex items-center justify-between gap-200">
          <p className="font-rubik text-lg font-medium text-fg-primary">
            Vaše údaje
          </p>
          <LinkButton
            as={NextLink}
            className={summaryEditLinkClassName}
            href={detailsStepHref}
            icon="token-icon-pen"
            size="sm"
            theme="unstyled"
          >
            Upraviť
          </LinkButton>
        </div>

        <div className="grid gap-300">
            <div className="grid gap-x-250 gap-y-150 grid-cols-2 sm:grid-cols-3">
              {shippingAddressRows.map((row) => (
                <div className="space-y-50 px-150 py-100" key={`shipping-${row.label}`}>
                  <p className="text-sm text-fg-tertiary">{row.label}</p>
                  <p className="text-sm leading-relaxed text-fg-primary">
                    {resolveValue(row.value)}
                  </p>
                </div>
              ))}
            </div>
        </div>

        {!hasStoredAddress ? (
          <SupportingText className="text-warning">
            Niektoré povinné údaje ešte nie sú uložené.
          </SupportingText>
        ) : null}
      </section>
    </section>
  );
}

function SummaryRecapCard({
  href,
  icon,
  label,
  tone = "default",
}: {
  href: string;
  icon: IconType;
  label: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-sm border border-border-primary bg-surface space-y-300 px-350 py-300">
      <div className="flex items-center justify-between gap-200">
        <div className="flex min-w-0 items-center gap-450">
          <span className="flex h-600 w-600 shrink-0 items-center justify-center text-fg-primary">
            <Icon icon={icon} size="lg" />
          </span>
          <p
            className={
              tone === "warning"
                ? "text-sm font-medium text-warning"
                : "text-sm font-medium text-fg-primary"
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
          size="sm"
          theme="unstyled"
        >
          Upraviť
        </LinkButton>
      </div>
    </div>
  );
}
