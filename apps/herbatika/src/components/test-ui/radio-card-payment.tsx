"use client";

import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { RadioCard } from "@techsio/ui-kit/molecules/radio-card";
import { useState } from "react";

type CheckoutOption = {
  actionLabel?: string;
  bodyText?: string;
  disabled?: boolean;
  hint?: string;
  icon: IconType;
  priceLabel: string;
  priceTone?: "default" | "success";
  title: string;
  value: string;
};

const SHIPPING_OPTIONS: CheckoutOption[] = [
  {
    value: "store-pickup",
    title: "Doručenie na predajňu",
    icon: "icon-[mdi--map-marker-outline]",
    priceLabel: "+ 3,99 €",
  },
  {
    value: "express-courier",
    title: "Najrýchlejšie doručenie kuriérom",
    hint: "Doručenie do 5.1.",
    icon: "icon-[mdi--truck-fast-outline]",
    priceLabel: "+ 9,49 €",
  },
  {
    value: "pickup-point",
    title: "Packeta Z-Box/výdajne miesto",
    bodyText:
      "Vašu objednávku doručíme na Vami zvolený Z-Box alebo výdajné miesto.",
    actionLabel: "Vybrať výdajné miesto",
    icon: "icon-[mdi--package-variant-closed]",
    priceLabel: "+ 2,99 €",
  },
  {
    value: "eco-courier",
    title: "Ekologická doprava kuriérom",
    hint: "Doručenie do 8.1.",
    icon: "icon-[mdi--leaf-outline]",
    priceLabel: "+ 4,99 €",
  },
];

const PAYMENT_OPTIONS: CheckoutOption[] = [
  {
    value: "card",
    title: "Platba kartou online",
    bodyText:
      "Zrýchlená online platba. Po dokončení objednávky budete presmerovaní na platobnú bránu Comgate.",
    icon: "icon-[mdi--credit-card-outline]",
    priceLabel: "Zadarmo",
    priceTone: "success",
  },
  {
    value: "paypal",
    title: "PayPal",
    icon: "icon-[mdi--paypal]",
    priceLabel: "Zadarmo",
    priceTone: "success",
  },
  {
    value: "bank-transfer",
    title: "Platba bankovým prevodom",
    disabled: true,
    icon: "icon-[mdi--bank-outline]",
    priceLabel: "Zadarmo",
    priceTone: "success",
  },
  {
    value: "cash-on-delivery",
    title: "Na dobierku",
    icon: "icon-[mdi--cash]",
    priceLabel: "+ 1,99 €",
  },
];

type CheckoutOptionCardProps = {
  defaultValue: string;
  label: string;
  options: CheckoutOption[];
};

function CheckoutOptionCard({
  defaultValue,
  label,
  options,
}: CheckoutOptionCardProps) {
  const [value, setValue] = useState<string | null>(defaultValue);

  return (
    <RadioCard
      onValueChange={setValue}
      orientation="vertical"
      size="sm"
      value={value}
      variant="outline"
    >
      <RadioCard.Label className="text-xl">{label}</RadioCard.Label>

      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <RadioCard.Item
            className={`${isSelected && "border-2"} p-150`}
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
                    <RadioCard.ItemText
                      className={
                        `${isSelected && "font-semibold"}`
                      }
                    >
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

            {isSelected && (option.bodyText || option.actionLabel) ? (
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
              </RadioCard.ItemAddon>
            ) : null}
          </RadioCard.Item>
        );
      })}
    </RadioCard>
  );
}
/*
function CheckoutOptionIndicator({
  disabled,
  isSelected,
}: {
  disabled?: boolean;
  isSelected: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-400 w-400 shrink-0 items-center justify-center rounded-full border ${
        disabled
          ? "border-border-disabled bg-bg-disabled"
          : isSelected
            ? "border-primary"
            : "border-border-primary bg-surface"
      }`}
    >
      {isSelected ? (
        <span
          className={`h-200 w-200 rounded-full ${
            disabled ? "bg-border-disabled" : "bg-primary"
          }`}
        />
      ) : null}
    </span>
  );
}*/

function CheckoutOptionPrice({
  priceLabel,
  priceTone = "default",
}: {
  priceLabel: string;
  priceTone?: CheckoutOption["priceTone"];
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

type CheckoutShippingPreviewProps = {
  defaultValue?: string;
};

export function CheckoutShippingPreview({
  defaultValue = "pickup-point",
}: CheckoutShippingPreviewProps) {
  return (
    <CheckoutOptionCard
      defaultValue={defaultValue}
      label="Doprava"
      options={SHIPPING_OPTIONS}
    />
  );
}

type CheckoutPaymentPreviewProps = {
  defaultValue?: string;
};

export function CheckoutPaymentPreview({
  defaultValue = "card",
}: CheckoutPaymentPreviewProps) {
  return (
    <CheckoutOptionCard
      defaultValue={defaultValue}
      label="Platba"
      options={PAYMENT_OPTIONS}
    />
  );
}
