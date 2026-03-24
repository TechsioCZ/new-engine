import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import NextLink from "next/link";
import type { AddressFormState } from "@/components/checkout/checkout.constants";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { SupportingText } from "@/components/text/supporting-text";

type CheckoutCompleteSectionProps = {
  addressForm: AddressFormState;
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
  paymentLabel?: string;
  shippingLabel?: string;
  shippingStepHref: string;
};

const resolveAddressRows = (form: AddressFormState) => {
  return [
    { label: "Meno", value: form.firstName },
    { label: "Priezvisko", value: form.lastName },
    { label: "Názov firmy", value: form.company },
    { label: "IČO", value: form.companyId },
    { label: "DIČ", value: form.taxId },
    { label: "IČ DPH", value: form.vatId },
    { label: "E-mail", value: form.email },
    { label: "Telefón", value: form.phone },
    { label: "Krajina", value: form.countryCode },
    { label: "Mesto", value: form.city },
    { label: "PSČ", value: form.postalCode },
    { label: "Ulica a číslo domu", value: form.address1 },
  ];
};

const resolveValue = (value: string) => {
  return value.trim().length > 0 ? value : "—";
};

export function CheckoutCompleteSection({
  addressForm,
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
  paymentLabel,
  shippingLabel,
  shippingStepHref,
}: CheckoutCompleteSectionProps) {
  const addressRows = resolveAddressRows(addressForm);

  return (
    <section className="space-y-300 font-inter">
      <h2 className="font-rubik text-xl font-medium text-fg-primary">Súhrn objednávky</h2>

      <div className="space-y-250 rounded-sm border border-border-primary bg-surface p-550">
        <div className="flex items-start justify-between gap-200 border-b border-border-secondary pb-250">
          <p className="text-sm text-fg-primary">Spolu s DPH</p>
          <div className="text-right">
            <p className="text-2xl font-bold text-fg-primary">
              {formatCurrencyAmount(cartTotalAmount, currencyCode)}
            </p>
            <SupportingText className="text-fg-secondary">
              {`bez DPH: ${formatCurrencyAmount(cartTotalWithoutTaxAmount, currencyCode)}`}
            </SupportingText>
          </div>
        </div>

        <div className="space-y-150">
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

        <div className="space-y-150">
          <Button
            block
            className="font-rubik"
            icon="token-icon-chevron-right"
            iconPosition="right"
            isLoading={isCompletingOrder}
            onClick={() => {
              void onCompleteOrder();
            }}
            type="button"
            variant="primary"
          >
            Dokončiť objednávku
          </Button>
          <SupportingText className="text-fg-secondary">
            Potvrdzujem, že som sa oboznámil s obchodnými podmienkami a ochranou osobných údajov.
          </SupportingText>
        </div>
      </div>

      <div className="space-y-150 rounded-sm border border-border-primary bg-surface p-250">
        <div className="flex items-center justify-between gap-200">
          <p className="text-sm font-medium text-fg-primary">Doprava</p>
          <LinkButton
            as={NextLink}
            className="px-0 underline"
            href={shippingStepHref}
            size="sm"
            theme="unstyled"
          >
            Upraviť
          </LinkButton>
        </div>
        <SupportingText className={hasShipping ? "text-fg-primary" : "text-warning"}>
          {hasShipping ? shippingLabel ?? "Zvolená doprava" : "Doprava nie je vybraná"}
        </SupportingText>
      </div>

      <div className="space-y-150 rounded-sm border border-border-primary bg-surface p-250">
        <div className="flex items-center justify-between gap-200">
          <p className="text-sm font-medium text-fg-primary">Platba</p>
          <LinkButton
            as={NextLink}
            className="px-0 underline"
            href={shippingStepHref}
            size="sm"
            theme="unstyled"
          >
            Upraviť
          </LinkButton>
        </div>
        <SupportingText className={hasPayment ? "text-fg-primary" : "text-warning"}>
          {hasPayment ? paymentLabel ?? "Zvolená platba" : "Platba nie je vybraná"}
        </SupportingText>
      </div>

      <div className="space-y-200 rounded-sm border border-border-primary bg-surface p-250">
        <div className="flex items-center justify-between gap-200">
          <p className="text-sm font-medium text-fg-primary">Vaše údaje</p>
          <LinkButton
            as={NextLink}
            className="px-0 underline"
            href={detailsStepHref}
            size="sm"
            theme="unstyled"
          >
            Upraviť
          </LinkButton>
        </div>
        <div className="grid gap-150 sm:grid-cols-2">
          {addressRows.map((row) => (
            <div className="space-y-50" key={row.label}>
              <SupportingText className="text-fg-secondary">{row.label}</SupportingText>
              <p className="text-sm text-fg-primary">{resolveValue(row.value)}</p>
            </div>
          ))}
        </div>
        {!hasStoredAddress ? (
          <SupportingText className="text-warning">
            Niektoré povinné údaje ešte nie sú uložené.
          </SupportingText>
        ) : null}
      </div>

    </section>
  );
}
