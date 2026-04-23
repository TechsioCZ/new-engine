"use client";

import { useEffect, useState } from "react";
import { normalizeLineItemQuantity } from "@/lib/storefront/cart-line-item";

type UseCartItemQuantityInput = {
  baseQuantity: number;
  debounceMs?: number;
  itemId: string;
  maxQuantity: number;
  onUpdateQuantity: (lineItemId: string, quantity: number) => void;
};

export function useCartItemQuantity({
  baseQuantity,
  debounceMs = 250,
  itemId,
  maxQuantity,
  onUpdateQuantity,
}: UseCartItemQuantityInput) {
  const [localQuantity, setLocalQuantity] = useState(baseQuantity);

  useEffect(() => {
    setLocalQuantity(baseQuantity);
  }, [baseQuantity]);

  useEffect(() => {
    if (localQuantity === baseQuantity) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onUpdateQuantity(itemId, localQuantity);
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [baseQuantity, debounceMs, itemId, localQuantity, onUpdateQuantity]);

  const handleQuantityChange = (nextQuantity: number) => {
    if (!Number.isFinite(nextQuantity)) {
      return;
    }

    setLocalQuantity(normalizeLineItemQuantity(nextQuantity, maxQuantity));
  };

  return {
    handleQuantityChange,
    localQuantity,
  };
}
