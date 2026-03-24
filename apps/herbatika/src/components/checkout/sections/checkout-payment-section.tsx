import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { Button } from "@techsio/ui-kit/atoms/button";
import { resolveProviderLabel } from "@/components/checkout/checkout.utils";
import { SupportingText } from "@/components/text/supporting-text";

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
          paymentProviders.map((provider, index) => {
            const providerId = resolveProviderId(provider);
            const providerLabel = resolveProviderLabel(providerId);
            const isSelected =
              selectedPaymentProviderId && selectedPaymentProviderId.length > 0
                ? selectedPaymentProviderId === providerId
                : hasPayment && index === 0;
            const isProviderSelectable = Boolean(providerId && canInitiatePayment);
            const optionStatusLabel = isSelected ? "Zvolená možnosť" : "Dostupná možnosť";

            return (
              <Button
                className="w-full rounded-sm border border-border-primary bg-surface p-0 text-left data-[selected=true]:border-success"
                data-selected={isSelected}
                disabled={isBusy || isInitiatingPayment || !isProviderSelectable}
                key={providerId || `${providerLabel}-${index}`}
                onClick={() => {
                  if (!providerId) {
                    return;
                  }

                  void onSelectPaymentProvider(providerId);
                }}
                theme="unstyled"
                type="button"
              >
                <div className="space-y-150 px-550 w-full py-400">
                  <div className="flex flex-wrap items-center justify-between gap-200">
                    <div className="flex min-w-0 items-center gap-150">
                      <span
                        className="flex size-550 items-center justify-center rounded-full border border-fg-placeholder data-[selected=true]:border-success"
                        data-selected={isSelected}
                      >
                        <span
                          className="size-250 rounded-full bg-success opacity-0 data-[selected=true]:opacity-100"
                          data-selected={isSelected}
                        />
                      </span>
                      <Icon
                        className={`text-md ${isSelected ? "text-primary" : "text-fg-secondary"}`}
                        icon={resolvePaymentIcon(providerId)}
                      />
                      <p className="truncate text-md font-medium text-fg-primary">{providerLabel}</p>
                    </div>
                    <p className="text-md font-medium text-success">
                      Zadarmo
                    </p>
                  </div>
                  <SupportingText className="pl-700 text-fg-secondary">
                    {optionStatusLabel}
                  </SupportingText>
                </div>
              </Button>
            );
          })
        ) : (
          <SupportingText>Nie sú dostupné žiadne platobné metódy.</SupportingText>
        )}
      </div>
    </section>
  );
}
