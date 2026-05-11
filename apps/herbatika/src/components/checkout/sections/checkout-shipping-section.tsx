import { resolveShippingIcon } from "@/components/checkout/checkout-display.utils";
import {
  resolveCarrierPickupHint,
  resolveCarrierPickupRequirement,
} from "@/components/checkout/carrier-pickup.utils";
import { SupportingText } from "@/components/text/supporting-text";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { useEffect, useMemo, useState } from "react";
import { CheckoutCarrierPickupDetails } from "./checkout-carrier-pickup-details";
import { CheckoutOptionRadioCard } from "./checkout-option-radio-card";

type ShippingOption = {
  data?: Record<string, unknown> | null;
  id: string;
  name?: string | null;
  provider_id?: string | null;
};

type CheckoutShippingSectionProps = {
  currencyCode: string;
  hasShipping: boolean;
  isBusy: boolean;
  onSelectShipping: (optionId: string, data?: Record<string, unknown>) => void;
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
  const [pendingPickupOptionId, setPendingPickupOptionId] = useState<
    string | null
  >(null);

  const pickupRequirements = useMemo(
    () =>
      new Map(
        shippingOptions.flatMap((option) => {
          const requirement = resolveCarrierPickupRequirement(option);

          return requirement ? [[option.id, requirement]] : [];
        }),
      ),
    [shippingOptions],
  );

  useEffect(() => {
    if (
      pendingPickupOptionId &&
      !shippingOptions.some((option) => option.id === pendingPickupOptionId)
    ) {
      setPendingPickupOptionId(null);
    }
  }, [pendingPickupOptionId, shippingOptions]);

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
      </header>
      <div className="grid gap-150">
        {shippingOptions.length > 0 ? (
          <CheckoutOptionRadioCard
            label="Doprava"
            onValueChange={(value) => {
              if (pickupRequirements.has(value)) {
                setPendingPickupOptionId(value);
                return;
              }

              setPendingPickupOptionId(null);
              void onSelectShipping(value);
            }}
            options={shippingOptions.map((option) => {
              const optionPrice = shippingPrices[option.id] ?? 0;
              const pickupRequirement = pickupRequirements.get(option.id);

              return {
                addon: pickupRequirement ? (
                  <CheckoutCarrierPickupDetails
                    disabled={isBusy}
                    onConfirm={(data) => {
                      void onSelectShipping(option.id, data);
                    }}
                    requirement={pickupRequirement}
                  />
                ) : undefined,
                disabled: isBusy,
                hint: pickupRequirement
                  ? resolveCarrierPickupHint(pickupRequirement)
                  : undefined,
                icon: resolveShippingIcon(option),
                priceLabel: resolveShippingPriceLabel(optionPrice),
                priceTone: optionPrice > 0 ? "default" : "success",
                title: option.name ?? option.id,
                value: option.id,
              };
            })}
            value={pendingPickupOptionId ?? selectedShippingMethodId ?? null}
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
