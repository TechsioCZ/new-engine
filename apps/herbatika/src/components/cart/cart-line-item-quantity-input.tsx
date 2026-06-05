"use client";

import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import { useCallback, useEffect, useRef, useState } from "react";

type CartLineItemQuantityInputProps = {
  className?: string;
  controlClassName?: string;
  inputClassName?: string;
  isPending: boolean;
  itemName: string;
  lineItemId: string;
  maxQuantity: number;
  onRemove: (lineItemId: string) => void;
  onUpdateQuantity: (lineItemId: string, quantity: number) => void;
  quantity: number;
  size?: "sm" | "md" | "lg";
};

export function CartLineItemQuantityInput({
  className,
  controlClassName,
  inputClassName,
  isPending,
  itemName,
  lineItemId,
  maxQuantity,
  onRemove,
  onUpdateQuantity,
  quantity,
  size = "md",
}: CartLineItemQuantityInputProps) {
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingUpdate = useCallback(() => {
    if (updateTimeoutRef.current === null) {
      return;
    }

    clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    setLocalQuantity(quantity);
    clearPendingUpdate();
  }, [clearPendingUpdate, quantity]);

  useEffect(() => {
    return clearPendingUpdate;
  }, [clearPendingUpdate]);

  const handleQuantityChange = (nextQuantity: number) => {
    if (!Number.isFinite(nextQuantity)) {
      return;
    }

    const roundedQuantity = Math.round(nextQuantity);
    if (roundedQuantity <= 0) {
      clearPendingUpdate();
      onRemove(lineItemId);
      return;
    }

    const normalizedQuantity = Math.max(
      1,
      Math.min(roundedQuantity, maxQuantity),
    );
    setLocalQuantity(normalizedQuantity);
    clearPendingUpdate();

    if (normalizedQuantity === quantity) {
      return;
    }

    updateTimeoutRef.current = setTimeout(() => {
      onUpdateQuantity(lineItemId, normalizedQuantity);
      updateTimeoutRef.current = null;
    }, 250);
  };

  return (
    <NumericInput
      allowOverflow={false}
      className={className}
      max={maxQuantity}
      min={0}
      onChange={handleQuantityChange}
      size={size}
      value={localQuantity}
    >
      <NumericInput.Control className={controlClassName}>
        <NumericInput.DecrementTrigger
          disabled={isPending || localQuantity <= 0}
        />
        <NumericInput.Input
          aria-label={`Množstvo pre ${itemName}`}
          className={inputClassName}
        />
        <NumericInput.IncrementTrigger
          disabled={isPending || localQuantity >= maxQuantity}
        />
      </NumericInput.Control>
    </NumericInput>
  );
}
