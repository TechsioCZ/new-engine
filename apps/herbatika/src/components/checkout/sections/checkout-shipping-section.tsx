import type { IconType } from "@techsio/ui-kit/atoms/icon";
import { SupportingText } from "@/components/text/supporting-text";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { CheckoutOptionRadioCard } from "./checkout-option-radio-card";

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
        <SupportingText className="text-fg-secondary">
          {hasShipping ? "Doprava je zvolená." : "Vyberte spôsob dopravy."}
        </SupportingText>
      </header>
      <div className="grid gap-150">
        {shippingOptions.length > 0 ? (
          <CheckoutOptionRadioCard
            label="Doprava"
            onValueChange={(value) => {
              void onSelectShipping(value);
            }}
            options={shippingOptions.map((option) => {
              const optionPrice = shippingPrices[option.id] ?? 0;

              return {
                disabled: isBusy,
                icon: resolveShippingIcon(option),
                priceLabel: resolveShippingPriceLabel(optionPrice),
                priceTone: optionPrice > 0 ? "default" : "success",
                title: option.name ?? option.id,
                value: option.id,
              };
            })}
            value={selectedShippingMethodId ?? null}
          />
        ) : (
          <SupportingText>
            Nie sú dostupné žiadne možnosti dopravy.
          </SupportingText>
        )}
      </div>
    </section>
  );
}
