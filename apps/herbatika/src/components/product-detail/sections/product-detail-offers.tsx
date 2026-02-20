"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import type { VolumeDiscountOption } from "@/components/product-detail/product-detail.types";

type ProductDetailOffersProps = {
  isAdding: boolean;
  onAddToCart: () => void;
  onSelectOption: (optionId: string) => void;
  options: VolumeDiscountOption[];
  selectedOptionId: string | null;
};

export function ProductDetailOffers({
  isAdding,
  onAddToCart,
  onSelectOption,
  options,
  selectedOptionId,
}: ProductDetailOffersProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <section className="space-y-250 rounded-lg border border-border-secondary bg-surface p-300">
      <h2 className="text-xl font-semibold text-fg-primary">Množstevná zľava</h2>
      <div className="space-y-200">
        {options.map((option) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <Button
              className={`w-full rounded-lg border p-300 text-left ${
                isSelected
                  ? "border-primary bg-highlight"
                  : "border-border-secondary bg-surface-secondary"
              }`}
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              theme="unstyled"
              type="button"
            >
              <div className="flex items-start justify-between gap-300">
                <div className="flex items-start gap-200">
                  <Icon
                    className={isSelected ? "text-primary" : "text-fg-tertiary"}
                    icon={isSelected ? "token-icon-check" : "token-icon-chevron-right"}
                  />
                  <div className="space-y-50">
                    <p className="text-sm font-semibold text-fg-primary">{option.title}</p>
                    <ExtraText className="text-fg-secondary">{option.perUnitLabel}</ExtraText>
                  </div>
                </div>
                <div className="space-y-50 text-right">
                  <p className="text-sm font-semibold text-fg-primary">
                    {option.totalAmountLabel}
                  </p>
                  {option.oldTotalAmountLabel ? (
                    <ExtraText className="text-fg-tertiary line-through">
                      {option.oldTotalAmountLabel}
                    </ExtraText>
                  ) : null}
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      <Button block disabled={isAdding || !selectedOptionId} onClick={onAddToCart} variant="primary">
        {isAdding ? "Pridávam..." : "Pridať do košíka"}
      </Button>
    </section>
  );
}
