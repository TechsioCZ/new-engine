import { Button } from "@techsio/ui-kit/atoms/button";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";

type ShippingOption = {
  id: string;
  name?: string | null;
};

type CheckoutShippingSectionProps = {
  currencyCode: string;
  hasShipping: boolean;
  isBusy: boolean;
  onSelectShipping: (optionId: string) => Promise<void>;
  selectedShippingMethodId?: string | null;
  shippingOptions: ShippingOption[];
  shippingPrices: Record<string, number>;
};

export function CheckoutShippingSection({
  currencyCode,
  hasShipping,
  isBusy,
  onSelectShipping,
  selectedShippingMethodId,
  shippingOptions,
  shippingPrices,
}: CheckoutShippingSectionProps) {
  const resolveShippingPriceLabel = (amount: number) => {
    if (amount <= 0) {
      return "Zadarmo";
    }

    return `+ ${formatCurrencyAmount(amount, currencyCode)}`;
  };

  return (
    <section className="checkout-card space-y-250 p-550">
      <header className="space-y-50">
        <h2 className="text-xl font-medium text-fg-primary">2. Doprava</h2>
        <ExtraText className="text-fg-secondary">
          {hasShipping ? "Doprava je zvolená." : "Vyberte spôsob dopravy."}
        </ExtraText>
      </header>
      <div className="grid gap-200">
        {shippingOptions.length > 0 ? (
          shippingOptions.map((option) => {
            const optionPrice = shippingPrices[option.id] ?? 0;
            const isSelected = selectedShippingMethodId === option.id;

            return (
              <Button
                className={`w-full rounded-sm border p-0 text-left ${
                  isSelected ? "border-primary bg-highlight" : "border-border-primary bg-surface"
                }`}
                disabled={isBusy}
                key={option.id}
                onClick={() => {
                  void onSelectShipping(option.id);
                }}
                theme="unstyled"
                type="button"
              >
                <div className="space-y-150 px-550 py-400">
                  <div className="flex flex-wrap items-center justify-between gap-200">
                    <div className="flex items-center gap-150">
                      <span
                        className={`flex size-300 items-center justify-center rounded-full border ${
                          isSelected ? "border-primary" : "border-fg-secondary"
                        }`}
                      >
                        {isSelected ? <span className="size-150 rounded-full bg-primary" /> : null}
                      </span>
                      <p className="text-sm font-medium text-fg-primary">{option.name ?? option.id}</p>
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        optionPrice > 0 ? "text-fg-primary" : "text-success"
                      }`}
                    >
                      {resolveShippingPriceLabel(optionPrice)}
                    </p>
                  </div>
                  <ExtraText className="pl-450 text-fg-secondary">
                    {isSelected ? "Zvolená možnosť" : "Dostupná možnosť"}
                  </ExtraText>
                </div>
              </Button>
            );
          })
        ) : (
          <ExtraText>Nie sú dostupné žiadne možnosti dopravy.</ExtraText>
        )}
      </div>
    </section>
  );
}
