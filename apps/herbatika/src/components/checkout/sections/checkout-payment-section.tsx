import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import {
  resolvePaymentIcon,
  resolveProviderLabel,
} from "@/components/checkout/checkout-display.utils";
import { SupportingText } from "@/components/text/supporting-text";
import { CheckoutOptionRadioCard } from "./checkout-option-radio-card";

type PaymentProvider = {
  id?: string | null;
};

type CheckoutPaymentSectionProps = {
  canInitiatePayment: boolean;
  isBusy: boolean;
  isInitiatingPayment: boolean;
  onSelectPaymentProvider: (providerId: string) => Promise<void>;
  paymentProviders: PaymentProvider[];
  selectedPaymentProviderId?: string | null;
  selectionMessage?: string | null;
};

const resolveProviderId = (provider: PaymentProvider) => {
  if (typeof provider.id === "string") {
    return provider.id;
  }

  return "";
};

export function CheckoutPaymentSection({
  canInitiatePayment,
  isBusy,
  isInitiatingPayment,
  onSelectPaymentProvider,
  paymentProviders,
  selectedPaymentProviderId,
  selectionMessage,
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
            value={selectedPaymentProviderId ?? null}
          />
        ) : (
          <SupportingText>
            Nie sú dostupné žiadne platobné metódy.
          </SupportingText>
        )}
        {paymentProviders.length > 0 && selectionMessage ? (
          <PaymentSelectionMessage message={selectionMessage} />
        ) : null}
      </div>
    </section>
  );
}

function PaymentSelectionMessage({ message }: { message: string }) {
  return (
    <StatusText
      aria-live="polite"
      className="text-xs leading-relaxed"
      showIcon
      size="sm"
      status="error"
    >
      {message}
    </StatusText>
  );
}
