import { Button } from "@techsio/ui-kit/atoms/button";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
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

const resolveShippingIcon = (option: ShippingOption): IconType => {
  const normalizedValue = `${option.name ?? ""} ${option.id}`.toLowerCase();

  if (
    normalizedValue.includes("packeta") ||
    normalizedValue.includes("box") ||
    normalizedValue.includes("pickup") ||
    normalizedValue.includes("predaj")
  ) {
    return "icon-[mdi--package-variant-closed]";
  }

  if (
    normalizedValue.includes("express") ||
    normalizedValue.includes("kurier") ||
    normalizedValue.includes("courier")
  ) {
    return "icon-[mdi--truck-fast-outline]";
  }

  if (normalizedValue.includes("eko") || normalizedValue.includes("eco")) {
    return "icon-[mdi--leaf]";
  }

  return "icon-[mdi--truck-delivery-outline]";
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
    <section className="space-y-250 rounded-sm p-550 font-rubik">
      <header className="space-y-50">
        <h2 className="text-xl font-medium text-fg-primary">Doprava</h2>
        <ExtraText className="text-fg-secondary">
          {hasShipping ? "Doprava je zvolená." : "Vyberte spôsob dopravy."}
        </ExtraText>
      </header>
      <div className="grid gap-150">
        {shippingOptions.length > 0 ? (
          shippingOptions.map((option) => {
            const optionPrice = shippingPrices[option.id] ?? 0;
            const isSelected = selectedShippingMethodId === option.id;
            const optionStatusLabel = isSelected ? "Zvolená možnosť" : "Dostupná možnosť";

            return (
              <Button
                className="w-full rounded-sm border border-border-primary bg-surface p-0 text-left data-[selected=true]:border-success"
                data-selected={isSelected}
                disabled={isBusy}
                key={option.id}
                onClick={() => {
                  void onSelectShipping(option.id);
                }}
                theme="unstyled"
                type="button"
              >
                <div className="space-y-150 px-550 py-400 w-full">
                  <div className="flex flex-wrap items-center justify-between w-full gap-200">
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
                        icon={resolveShippingIcon(option)}
                      />
                      <p className="truncate text-md font-medium text-fg-primary">
                        {option.name ?? option.id}
                      </p>
                    </div>
                    <p
                      className={`text-md font-medium ${
                        optionPrice > 0 ? "text-fg-primary" : "text-success"
                      }`}
                    >
                      {resolveShippingPriceLabel(optionPrice)}
                    </p>
                  </div>
                  <ExtraText className="pl-700 text-fg-secondary">{optionStatusLabel}</ExtraText>
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
