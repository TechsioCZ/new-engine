"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { RadioCard } from "@techsio/ui-kit/molecules/radio-card";
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group";
import { useState } from "react";

type CustomerTypeOption = {
  description: string;
  title: string;
  value: string;
};

type CheckoutCardOption = {
  actionLabel?: string;
  bodyText?: string;
  disabled?: boolean;
  hint?: string;
  icon: IconType;
  originalPriceLabel?: string;
  priceLabel: string;
  priceTone?: "default" | "success";
  subtitle?: string;
  title: string;
  value: string;
};

const CUSTOMER_TYPE_OPTIONS: CustomerTypeOption[] = [
  {
    value: "private",
    title: "Súkromná osoba",
    description: "Nakupujem pre seba alebo domácnosť.",
  },
  {
    value: "company",
    title: "Nakupujem na firmu",
    description: "Potrebujem IČO, DIČ a fakturačné údaje.",
  },
];

const QUANTITY_DISCOUNT_OPTIONS: CheckoutCardOption[] = [
  {
    value: "quantity-2",
    title: "Kúpte 2 a ušetrite",
    subtitle: "15,99€ / kus",
    priceLabel: "31,98€",
    originalPriceLabel: "43,98€",
    icon: "token-icon-check",
  },
  {
    value: "quantity-3",
    title: "Kúpte 3 a ušetrite",
    subtitle: "14,99€ / kus",
    priceLabel: "44,97€",
    originalPriceLabel: "65,97€",
    icon: "token-icon-check",
  },
];

const SHIPPING_OPTIONS: CheckoutCardOption[] = [
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

const PAYMENT_OPTIONS: CheckoutCardOption[] = [
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

type CheckoutCustomerTypePreviewProps = {
  defaultValue?: string;
};

export function CheckoutCustomerTypePreview({
  defaultValue = "private",
}: CheckoutCustomerTypePreviewProps) {
  return (
    <RadioGroup
      defaultValue={defaultValue}
      orientation="horizontal"
      size="sm"
      variant="subtle"
    >
      <RadioGroup.ItemGroup className="">
        {CUSTOMER_TYPE_OPTIONS.map((option) => (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
          >
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl/>
            <RadioGroup.ItemContent>
              <RadioGroup.ItemText>{option.title}</RadioGroup.ItemText>
            </RadioGroup.ItemContent>
          </RadioGroup.Item>
        ))}
      </RadioGroup.ItemGroup>
    </RadioGroup>
  );
}

type CheckoutCardPreviewProps = {
  controlType: "checkbox" | "radio";
  defaultValue: string;
  label: string;
  options: CheckoutCardOption[];
  rowStyle: "checkout" | "quantity";
};

function CheckoutCardPreview({
  controlType,
  defaultValue,
  label,
  options,
  rowStyle,
}: CheckoutCardPreviewProps) {
  const [value, setValue] = useState<string | null>(defaultValue);

  return (
    <RadioCard
      onValueChange={setValue}
      orientation="vertical"
      size="sm"
      value={value}
      variant="outline"
    >
      <RadioCard.Label className="text-xl">
        {label}
      </RadioCard.Label>
        {options.map((option) => (
          <RadioCard.Item
            className={resolveOfferItemClassName({
              disabled: option.disabled,
              isSelected: value === option.value,
              rowStyle,
            })}
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl className="flex-col">
              <div className={resolveOfferRowClassName(rowStyle)}>
                <div className="flex min-w-0 flex-1 items-center gap-200">
                  <OfferIndicator
                    controlType={controlType}
                    disabled={option.disabled}
                    isSelected={value === option.value}
                  />
                  {rowStyle === "checkout" ? (
                    <span className="flex shrink-0 items-center justify-center text-fg-primary">
                      <Icon icon={option.icon} size="lg" />
                    </span>
                  ) : null}

                  <RadioCard.ItemContent>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-150 gap-y-50">
                      <RadioCard.ItemText
                        className={resolveOfferTitleClassName({
                          isSelected: value === option.value,
                          rowStyle,
                        })}
                      >
                        {option.title}
                      </RadioCard.ItemText>
                      {option.hint ? (
                        <span className="text-xs leading-tight text-fg-secondary">
                          {option.hint}
                        </span>
                      ) : null}
                    </div>
                    {option.subtitle ? (
                      <RadioCard.ItemDescription className="text-sm text-fg-secondary">
                        {option.subtitle}
                      </RadioCard.ItemDescription>
                    ) : null}
                  </RadioCard.ItemContent>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-50 text-right">
                  <span
                    className={resolveOfferPriceClassName(option.priceTone)}
                  >
                    {option.priceLabel}
                  </span>
                  {option.originalPriceLabel ? (
                    <span className="text-sm leading-tight text-fg-secondary line-through">
                      {option.originalPriceLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              {value === option.value &&
              (option.bodyText || option.actionLabel) ? (
                <div className="space-y-100 border-t border-border-secondary px-250 py-200">
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
                </div>
              ) : null}
            </RadioCard.ItemControl>
          </RadioCard.Item>
        ))}
    </RadioCard>
  );
}

function OfferIndicator({
  controlType,
  disabled,
  isSelected,
}: {
  controlType: "checkbox" | "radio";
  disabled?: boolean;
  isSelected: boolean;
}) {
  if (controlType === "checkbox") {
    return (
      <span
        aria-hidden="true"
        className={`flex h-500 w-500 shrink-0 items-center justify-center rounded-sm border ${
          disabled
            ? "border-border-disabled bg-bg-disabled text-fg-disabled"
            : isSelected
              ? "border-primary bg-primary text-fg-reverse"
              : "border-border-primary bg-surface text-fg-reverse"
        }`}
      >
        {isSelected ? (
          <Icon className="text-xs" icon="token-icon-check" />
        ) : null}
      </span>
    );
  }

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
}

function resolveOfferItemClassName({
  disabled,
  isSelected,
  rowStyle,
}: {
  disabled?: boolean;
  isSelected: boolean;
  rowStyle: "checkout" | "quantity";
}) {
  return [
    "overflow-hidden border bg-surface shadow-none",
    rowStyle === "quantity" ? "rounded-[10px]" : "rounded-md",
    isSelected ? "border-2 border-primary" : "border-border-secondary",
    rowStyle === "quantity" && isSelected ? "bg-highlight" : "",
    disabled ? "opacity-60" : "",
  ].join(" ");
}

function resolveOfferPriceClassName(
  priceTone: CheckoutCardOption["priceTone"] = "default",
) {
  return priceTone === "success"
    ? "text-sm font-medium leading-tight text-success"
    : "text-sm font-medium leading-tight text-fg-primary";
}

function resolveOfferRowClassName(rowStyle: "checkout" | "quantity") {
  return [
    "flex w-full justify-between gap-200",
    rowStyle === "quantity"
      ? "items-center p-250"
      : "items-center px-250 py-200",
  ].join(" ");
}

function resolveOfferTitleClassName({
  isSelected,
  rowStyle,
}: {
  isSelected: boolean;
  rowStyle: "checkout" | "quantity";
}) {
  if (rowStyle === "quantity") {
    return "text-md font-medium text-fg-primary";
  }

  return isSelected
    ? "text-sm font-semibold text-fg-primary"
    : "text-sm font-normal text-fg-primary";
}

type CheckoutShippingPreviewProps = {
  defaultValue?: string;
};

export function CheckoutShippingPreview({
  defaultValue = "pickup-point",
}: CheckoutShippingPreviewProps) {
  return (
    <CheckoutCardPreview
      controlType="radio"
      defaultValue={defaultValue}
      label="Doprava"
      options={SHIPPING_OPTIONS}
      rowStyle="checkout"
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
    <CheckoutCardPreview
      controlType="radio"
      defaultValue={defaultValue}
      label="Platba"
      options={PAYMENT_OPTIONS}
      rowStyle="checkout"
    />
  );
}

type QuantityDiscountPreviewProps = {
  defaultValue?: string;
};

export function QuantityDiscountPreview({
  defaultValue = "quantity-2",
}: QuantityDiscountPreviewProps) {
  return (
    <div className="max-w-[624px] space-y-200 rounded-[10px] bg-surface p-300">
      <CheckoutCardPreview
        controlType="checkbox"
        defaultValue={defaultValue}
        label="Množstevná zľava"
        options={QUANTITY_DISCOUNT_OPTIONS}
        rowStyle="quantity"
      />

      <Button block icon="token-icon-cart" size="sm" variant="primary">
        Pridať do košíka
      </Button>
    </div>
  );
}
