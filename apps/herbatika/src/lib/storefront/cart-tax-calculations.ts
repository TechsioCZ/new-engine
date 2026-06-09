import type { HttpTypes } from "@medusajs/types";

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const hasExplicitlyNoLineItems = (cart: HttpTypes.StoreCart): boolean => {
  return Array.isArray(cart.items) && cart.items.length === 0;
};

export const resolveCartItemsTaxAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart || hasExplicitlyNoLineItems(cart)) {
    return 0;
  }

  const itemTaxTotal = asFiniteNumber(
    (cart as unknown as Record<string, unknown>).item_tax_total,
  );
  if (itemTaxTotal !== null) {
    return Math.max(itemTaxTotal, 0);
  }

  return (
    cart.items?.reduce((sum, item) => {
      const itemRecord = item as unknown as Record<string, unknown>;
      return sum + (asFiniteNumber(itemRecord.tax_total) ?? 0);
    }, 0) ?? 0
  );
};

export const resolveCartShippingTaxAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0;
  }

  const shippingTaxTotal = asFiniteNumber(
    (cart as unknown as Record<string, unknown>).shipping_tax_total,
  );
  if (shippingTaxTotal !== null) {
    return Math.max(shippingTaxTotal, 0);
  }

  return (
    cart.shipping_methods?.reduce((sum, shippingMethod) => {
      const methodRecord = shippingMethod as unknown as Record<string, unknown>;
      return sum + (asFiniteNumber(methodRecord.tax_total) ?? 0);
    }, 0) ?? 0
  );
};

export const resolveCartShippingSubtotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
  fallbackAmount = 0,
): number => {
  const shippingSubtotal = asFiniteNumber(cart?.shipping_subtotal);
  if (shippingSubtotal !== null) {
    return Math.max(shippingSubtotal, 0);
  }

  const shippingTotal = asFiniteNumber(cart?.shipping_total);
  if (shippingTotal !== null) {
    return Math.max(shippingTotal - resolveCartShippingTaxAmount(cart), 0);
  }

  return fallbackAmount;
};
