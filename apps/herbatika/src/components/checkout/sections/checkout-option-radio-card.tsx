import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { RadioCard } from "@techsio/ui-kit/molecules/radio-card";
import type { ReactNode } from "react";

type CheckoutOptionRadioCardItem = {
  actionLabel?: string;
  addon?: ReactNode;
  bodyText?: string;
  disabled?: boolean;
  hint?: string;
  icon: IconType;
  priceLabel: string;
  priceTone?: "default" | "success";
  title: string;
  value: string;
};

type CheckoutOptionRadioCardProps = {
  label: string;
  onValueChange: (value: string) => void;
  options: CheckoutOptionRadioCardItem[];
  value?: string | null;
};

export function CheckoutOptionRadioCard({
  label,
  onValueChange,
  options,
  value,
}: CheckoutOptionRadioCardProps) {
  return (
    <RadioCard
      onValueChange={(nextValue) => {
        if (!nextValue) {
          return;
        }

        onValueChange(nextValue);
      }}
      orientation="vertical"
      size="sm"
      value={value ?? null}
      variant="outline"
    >
      <RadioCard.Label className="sr-only">{label}</RadioCard.Label>

      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <RadioCard.Item
            className="data-[state=checked]:border-2"
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl className="items-center">
              <RadioCard.ItemIndicator />

              <div className="flex min-w-0 flex-1 items-center gap-200">
                <span className="flex shrink-0 items-center justify-center text-fg-primary">
                  <Icon icon={option.icon} size="lg" />
                </span>

                <RadioCard.ItemContent className="flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-150 gap-y-50">
                    <RadioCard.ItemText className="data-[state=checked]:font-semibold">
                      {option.title}
                    </RadioCard.ItemText>

                    {option.hint ? (
                      <span className="text-xs leading-tight text-fg-secondary">
                        {option.hint}
                      </span>
                    ) : null}
                  </div>
                </RadioCard.ItemContent>
              </div>

              <CheckoutOptionPrice
                priceLabel={option.priceLabel}
                priceTone={option.priceTone}
              />
            </RadioCard.ItemControl>

            {isSelected &&
            (option.bodyText || option.actionLabel || option.addon) ? (
              <RadioCard.ItemAddon className="space-y-100">
                {option.bodyText ? (
                  <p className="text-xs leading-relaxed text-fg-secondary">
                    {option.bodyText}
                  </p>
                ) : null}

                {option.actionLabel ? (
                  <span className="inline-flex text-xs font-semibold text-primary underline">
                    {option.actionLabel}
                  </span>
                ) : null}

                {option.addon}
              </RadioCard.ItemAddon>
            ) : null}
          </RadioCard.Item>
        );
      })}
    </RadioCard>
  );
}

function CheckoutOptionPrice({
  priceLabel,
  priceTone = "default",
}: {
  priceLabel: string;
  priceTone?: CheckoutOptionRadioCardItem["priceTone"];
}) {
  return (
    <div className="flex shrink-0 flex-col items-end text-right">
      <span
        className={
          priceTone === "success"
            ? "text-sm font-medium leading-tight text-success"
            : "text-sm font-medium leading-tight text-fg-primary"
        }
      >
        {priceLabel}
      </span>
    </div>
  );
}
