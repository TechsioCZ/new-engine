"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { RadioCard } from "@techsio/ui-kit/molecules/radio-card";
import { useState } from "react";

type DiscountOption = {
  originalPriceLabel?: string;
  priceLabel: string;
  subtitle: string;
  title: string;
  value: string;
};

const DISCOUNT_OPTIONS: DiscountOption[] = [
  {
    value: "quantity-2",
    title: "Kúpte 2 a ušetrite",
    subtitle: "15,99€ / kus",
    priceLabel: "31,98€",
    originalPriceLabel: "43,98€",
  },
  {
    value: "quantity-3",
    title: "Kúpte 3 a ušetrite",
    subtitle: "14,99€ / kus",
    priceLabel: "44,97€",
    originalPriceLabel: "65,97€",
  },
];

type QuantityDiscountPreviewProps = {
  defaultValue?: string;
};

export function QuantityDiscountPreview({
  defaultValue = "quantity-2",
}: QuantityDiscountPreviewProps) {
  const [value, setValue] = useState<string | null>(defaultValue);

  return (
    <div className="grid gap-200">
      <RadioCard
        onValueChange={setValue}
        orientation="vertical"
        size="md"
        value={value}
        variant="subtle"
      >
        <RadioCard.Label className="text-xl">Množstevná zľava</RadioCard.Label>

        {DISCOUNT_OPTIONS.map((option) => {
          const isSelected = value === option.value;

          return (
            <RadioCard.Item
              className="data-[state=checked]:border-primary rounded-xs"
              key={option.value}
              value={option.value}
            >
              <RadioCard.ItemHiddenInput />

              <RadioCard.ItemControl className="items-center">
                <DiscountOptionIndicator isSelected={isSelected} />

                  <RadioCard.ItemContent>
                    <RadioCard.ItemText>
                      {option.title}
                    </RadioCard.ItemText>
                    <RadioCard.ItemDescription>
                      {option.subtitle}
                    </RadioCard.ItemDescription>
                  </RadioCard.ItemContent>
  

                <DiscountOptionPrice
                  originalPriceLabel={option.originalPriceLabel}
                  priceLabel={option.priceLabel}
                />
              </RadioCard.ItemControl>
            </RadioCard.Item>
          );
        })}
      </RadioCard>

      <Button block icon="token-icon-cart" size="sm" variant="primary">
        Pridať do košíka
      </Button>
    </div>
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
      {isSelected ? <Icon className="text-xs" icon="token-icon-check" /> : null}
    </span>
  );
}

function DiscountOptionPrice({
  originalPriceLabel,
  priceLabel,
}: {
  originalPriceLabel?: string;
  priceLabel: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-50 text-right">
      <span className="text-sm font-medium leading-tight text-fg-primary">
        {priceLabel}
      </span>
      {originalPriceLabel ? (
        <span className="text-sm leading-tight text-fg-secondary line-through">
          {originalPriceLabel}
        </span>
      ) : null}
    </div>
  );
}
