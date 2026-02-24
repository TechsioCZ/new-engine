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
    <section className="space-y-350 p-550">
      <h2 className="text-xl font-semibold text-fg-primary">Množstevná zľava</h2>

      <div className="space-y-350">
        {options.map((option) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <Button
              className={`w-full rounded-lg px-400 py-400 text-left ${
                isSelected
                  ? "border-2 border-primary bg-highlight"
                  : "border border-border-secondary bg-surface"
              }`}
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              theme="unstyled"
              type="button"
            >
              <div className="flex w-full items-center gap-400">
                <span
                  aria-hidden="true"
                  className={`flex h-500 w-500 shrink-0 items-center justify-center rounded-sm border ${
                    isSelected
                      ? "border-primary bg-primary text-fg-reverse"
                      : "border-border-primary bg-surface"
                  }`}
                >
                  {isSelected ? <Icon className="text-xs" icon="token-icon-check" /> : null}
                </span>

                <div className="space-y-150">
                  <p className="text-md font-medium text-fg-primary">{option.title}</p>
                  <ExtraText className="text-sm text-fg-tertiary">{option.perUnitLabel}</ExtraText>
                </div>

                <div className="ml-auto space-y-200 text-right">
                  <p className="text-md font-medium text-fg-primary">{option.totalAmountLabel}</p>
                  {option.oldTotalAmountLabel ? (
                    <ExtraText className="text-sm text-fg-tertiary line-through">
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
        <Icon className="text-xl" icon="token-icon-cart" />
        {isAdding ? "Pridávam..." : "Pridať do košíka"}
      </Button>
    </section>
  );
}
