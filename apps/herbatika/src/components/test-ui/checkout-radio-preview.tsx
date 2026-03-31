"use client";

import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group";

type CustomerTypeOption = {
  description: string;
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
      <RadioGroup.ItemGroup>
        {CUSTOMER_TYPE_OPTIONS.map((option) => (
          <RadioGroup.Item key={option.value} value={option.value}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl />
            <RadioGroup.ItemContent>
              <RadioGroup.ItemText>{option.title}</RadioGroup.ItemText>
            </RadioGroup.ItemContent>
          </RadioGroup.Item>
        ))}
      </RadioGroup.ItemGroup>
    </RadioGroup>
  );
}
