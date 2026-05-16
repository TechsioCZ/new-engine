"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { RadioCard } from "@techsio/ui-kit/molecules/radio-card";
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
    <section className="space-y-350 sm:p-550">
      <h2 className="text-xl font-semibold text-fg-primary">
        Množstevná zľava
      </h2>

      <div className="flex flex-col bg-surface p-550 rounded-base gap-y-350">
      <RadioCard
        onValueChange={(value) => {
          if (!value) {
            return;
          }

          onSelectOption(value);
        }}
        orientation="vertical"
        size="md"
        value={selectedOptionId}
        variant="subtle"
        className="gap-y-350"
      >
        <RadioCard.Label className="sr-only">Množstevná zľava</RadioCard.Label>

        {options.map((option) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <RadioCard.Item
              className="data-[state=checked]:border-primary data-[state=checked]:border-2"
              key={option.id}
              value={option.id}
            >
              <RadioCard.ItemHiddenInput />

              <RadioCard.ItemControl className="items-center">
                <DiscountOptionIndicator isSelected={isSelected} />

                <RadioCard.ItemContent>
                  <RadioCard.ItemText>
                    {option.title}
                  </RadioCard.ItemText>
                  <RadioCard.ItemDescription className="text-fg-tertiary">
                    {option.perUnitLabel}
                  </RadioCard.ItemDescription>
                </RadioCard.ItemContent>

                <DiscountOptionPrice
                  originalPriceLabel={option.oldTotalAmountLabel}
                  priceLabel={option.totalAmountLabel}
                />
              </RadioCard.ItemControl>
            </RadioCard.Item>
          );
        })}
      </RadioCard>

      <Button
        block
        disabled={!selectedOptionId}
        icon="token-icon-cart"
        isLoading={isAdding}
        loadingText="Pridávam..."
        onClick={onAddToCart}
        variant="primary"
      >
        Pridať do košíka
      </Button>

      </div>
    </section>
  );
}

function DiscountOptionIndicator({ isSelected }: { isSelected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-500 w-500 shrink-0 place-items-center rounded-[3px] border ${
        isSelected
          ? "border-primary bg-primary text-fg-reverse"
          : "border-border-primary bg-surface text-fg-reverse"
      }`}
    >
      {isSelected ? <Icon icon="token-icon-check" size="xs" /> : null}
    </span>
  );
}

function DiscountOptionPrice({
  originalPriceLabel,
  priceLabel,
}: {
  originalPriceLabel?: string | null;
  priceLabel: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-50 text-right">
      <span className="font-medium leading-tight text-fg-primary">
        {priceLabel}
      </span>
      {originalPriceLabel ? (
        <span className="text-sm leading-tight text-fg-tertiary line-through">
          {originalPriceLabel}
        </span>
      ) : null}
    </div>
  );
}
