import { Button } from "@techsio/ui-kit/atoms/button";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { resolveProviderLabel } from "@/components/checkout/checkout.utils";

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
    <section className="space-y-250 rounded-sm border border-border-primary bg-surface p-550">
      <header className="font-inter">
        <h2 className="text-xl font-medium text-fg-primary">3. Platba</h2>
      </header>
      <div className="grid gap-200">
        {paymentProviders.length > 0 ? (
          paymentProviders.map((provider, index) => {
            const providerId = resolveProviderId(provider);
            const providerLabel = resolveProviderLabel(providerId);
            const isSelected =
              selectedPaymentProviderId && selectedPaymentProviderId.length > 0
                ? selectedPaymentProviderId === providerId
                : hasPayment && index === 0;

            return (
              <div
                className={`flex flex-wrap items-center justify-between gap-250 rounded-sm border px-550 py-400 ${
                  isSelected ? "border-primary bg-highlight" : "border-border-primary bg-surface"
                }`}
                key={providerId || `${providerLabel}-${index}`}
              >
                <div className="space-y-50">
                  <p className="text-sm font-medium text-fg-primary">{providerLabel}</p>
                  <ExtraText className="text-fg-secondary">
                    Platba bude potvrdená po výbere.
                  </ExtraText>
                </div>
                <div className="flex items-center gap-200">
                  <ExtraText className="font-medium text-success">Zadarmo</ExtraText>
                  <Button
                    disabled={isBusy || !providerId || !canInitiatePayment}
                    isLoading={isInitiatingPayment}
                    onClick={() => {
                      void onSelectPaymentProvider(providerId);
                    }}
                    theme={isSelected ? "solid" : "outlined"}
                    type="button"
                    variant={isSelected ? "primary" : "secondary"}
                  >
                    {isSelected ? "Zvolená platba" : "Vybrať platbu"}
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <ExtraText>Nie sú dostupné žiadne platobné metódy.</ExtraText>
        )}
      </div>
    </section>
  );
}
