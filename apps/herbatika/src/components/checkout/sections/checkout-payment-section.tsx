import type { IconType } from "@techsio/ui-kit/atoms/icon";
import { resolveProviderLabel } from "@/components/checkout/checkout.utils";
import { SupportingText } from "@/components/text/supporting-text";
import { CheckoutOptionRadioCard } from "./checkout-option-radio-card";

type PaymentProvider = {
  id?: string | null;
};

type CheckoutPaymentSectionProps = {
  canInitiatePayment: boolean;
  hasPayment: boolean;
  isBusy: boolean;
  isInitiatingPayment: boolean;
  onSelectPaymentProvider: (providerId: string) => Promise<void>;
  paymentProviders: PaymentProvider[];
  selectedPaymentProviderId?: string | null;
};

const resolveProviderId = (provider: PaymentProvider) => {
  if (typeof provider.id === "string") {
    return provider.id;
  }

  return "";
};

const resolvePaymentIcon = (providerId: string): IconType => {
  const normalizedValue = providerId.toLowerCase();

  if (normalizedValue.includes("paypal")) {
    return "icon-[mdi--paypal]";
  }

  if (
    normalizedValue.includes("card") ||
    normalizedValue.includes("stripe") ||
    normalizedValue.includes("google") ||
    normalizedValue.includes("apple")
  ) {
    return "icon-[mdi--credit-card-outline]";
  }

  if (normalizedValue.includes("bank") || normalizedValue.includes("wire")) {
    return "icon-[mdi--bank-outline]";
  }

  if (normalizedValue.includes("cod") || normalizedValue.includes("cash")) {
    return "icon-[mdi--cash-multiple]";
  }

  return "icon-[mdi--wallet-outline]";
};

export function CheckoutPaymentSection({
  canInitiatePayment,
  hasPayment,
  isBusy,
  isInitiatingPayment,
  onSelectPaymentProvider,
  paymentProviders,
  selectedPaymentProviderId,
}: CheckoutPaymentSectionProps) {
  return (
    <section className="space-y-250 rounded-sm p-550 font-rubik">
      <header>
        <h2 className="text-xl font-medium text-fg-primary">Platba</h2>
      </header>
      <div className="grid gap-150">
        {paymentProviders.length > 0 ? (
          <CheckoutOptionRadioCard
            label="Platba"
            onValueChange={(value) => {
              void onSelectPaymentProvider(value);
            }}
            options={paymentProviders.map((provider, index) => {
              const providerId = resolveProviderId(provider);
              const providerLabel = resolveProviderLabel(providerId);
              const isProviderSelectable = Boolean(
                providerId && canInitiatePayment,
              );

              return {
                disabled:
                  isBusy || isInitiatingPayment || !isProviderSelectable,
                icon: resolvePaymentIcon(providerId),
                priceLabel: "Zadarmo",
                priceTone: "success" as const,
                title: providerLabel,
                value: providerId || `${providerLabel}-${index}`,
              };
            })}
            value={
              selectedPaymentProviderId && selectedPaymentProviderId.length > 0
                ? selectedPaymentProviderId
                : hasPayment
                  ? (paymentProviders[0]?.id ?? null)
                  : null
            }
          />
        ) : (
          <SupportingText>
            Nie sú dostupné žiadne platobné metódy.
          </SupportingText>
        )}
      </div>
    </section>
  );
}
