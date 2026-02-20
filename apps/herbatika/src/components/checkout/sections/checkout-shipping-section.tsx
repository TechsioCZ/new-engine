import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
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
  return (
    <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
      <header className="flex flex-wrap items-center justify-between gap-200">
        <h2 className="text-lg font-semibold text-fg-primary">2. Doprava</h2>
        <Badge variant={hasShipping ? "success" : "info"}>
          {hasShipping ? "Zvolená" : "Vyberte dopravu"}
        </Badge>
      </header>
      <div className="grid gap-200">
        {shippingOptions.length > 0 ? (
          shippingOptions.map((option) => {
            const optionPrice = shippingPrices[option.id] ?? 0;
            const isSelected = selectedShippingMethodId === option.id;

            return (
              <Button
                className={`w-full rounded-lg border p-300 text-left ${
                  isSelected
                    ? "border-primary bg-highlight"
                    : "border-border-secondary bg-surface-secondary"
                }`}
                disabled={isBusy}
                key={option.id}
                onClick={() => {
                  void onSelectShipping(option.id);
                }}
                theme="unstyled"
                type="button"
              >
                <div className="flex flex-wrap items-center justify-between gap-300">
                  <div className="flex items-center gap-200">
                    <Icon
                      className={isSelected ? "text-primary" : "text-fg-tertiary"}
                      icon={isSelected ? "token-icon-check" : "token-icon-chevron-right"}
                    />
                    <div className="space-y-50">
                      <p className="text-sm font-semibold text-fg-primary">
                        {option.name ?? option.id}
                      </p>
                      <ExtraText className="text-fg-secondary">
                        {isSelected ? "Zvolená doprava" : "Dostupná možnosť"}
                      </ExtraText>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-fg-primary">
                    {formatCurrencyAmount(optionPrice, currencyCode)}
                  </p>
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
