import { Badge } from "@techsio/ui-kit/atoms/badge";
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
}: CheckoutPaymentSectionProps) {
  return (
    <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
      <header className="flex flex-wrap items-center justify-between gap-200">
        <h2 className="text-lg font-semibold text-fg-primary">3. Platba</h2>
        <Badge variant={hasPayment ? "success" : "info"}>
          {hasPayment ? "Inicializovaná" : "Vyberte platbu"}
        </Badge>
      </header>
      <div className="grid gap-200">
        {paymentProviders.length > 0 ? (
          paymentProviders.map((provider, index) => {
            const providerId = resolveProviderId(provider);
            const providerLabel = resolveProviderLabel(providerId);

            return (
              <div
                className="flex flex-wrap items-center justify-between gap-250 rounded-lg border border-border-secondary bg-surface-secondary p-300"
                key={providerId || `${providerLabel}-${index}`}
              >
                <div className="space-y-50">
                  <p className="text-sm font-semibold text-fg-primary">{providerLabel}</p>
                  <ExtraText className="text-fg-secondary">
                    Platba bude potvrdená po výbere.
                  </ExtraText>
                </div>
                <Button
                  disabled={isBusy || !providerId || !canInitiatePayment}
                  isLoading={isInitiatingPayment}
                  onClick={() => {
                    void onSelectPaymentProvider(providerId);
                  }}
                  theme={hasPayment ? "solid" : "outlined"}
                  type="button"
                  variant={hasPayment ? "primary" : "secondary"}
                >
                  {hasPayment ? "Zvolená platba" : "Vybrať platbu"}
                </Button>
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
