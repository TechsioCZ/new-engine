"use client";

import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";

type CartItemQuantityInputProps = {
  className?: string;
  isPending: boolean;
  itemName: string;
  maxQuantity: number;
  onQuantityChange: (nextQuantity: number) => void;
  quantity: number;
};

export function CartItemQuantityInput({
  className,
  isPending,
  itemName,
  maxQuantity,
  onQuantityChange,
  quantity,
}: CartItemQuantityInputProps) {
  return (
    <NumericInput
      allowOverflow={false}
      className={className}
      max={maxQuantity}
      min={1}
      onChange={onQuantityChange}
      size="md"
      value={quantity}
    >
      <NumericInput.Control>
        <NumericInput.DecrementTrigger disabled={isPending || quantity <= 1} />
        <NumericInput.Input
          aria-label={`Množstvo pre ${itemName}`}
          className="text-center"
        />
        <NumericInput.IncrementTrigger
          disabled={isPending || quantity >= maxQuantity}
        />
      </NumericInput.Control>
    </NumericInput>
  );
}
