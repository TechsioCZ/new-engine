import type { HttpTypes } from "@medusajs/types";

export const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

export const resolveLineItemQuantity = (
  item: HttpTypes.StoreCartLineItem,
): number => {
  return Math.max(1, asFiniteNumber(item.quantity) ?? 1);
};

export const resolveLineItemTotalAmount = (
  item: HttpTypes.StoreCartLineItem,
): number => {
  const total = asFiniteNumber(item.total);
  if (total !== null) {
    return total;
  }

  const subtotal = asFiniteNumber(item.subtotal);
  if (subtotal !== null) {
    return subtotal;
  }

  const unitPrice = asFiniteNumber(item.unit_price) ?? 0;
  return unitPrice * resolveLineItemQuantity(item);
};

export const resolveLineItemUnitAmount = (
  item: HttpTypes.StoreCartLineItem,
): number => {
  const unitPrice = asFiniteNumber(item.unit_price);
  if (unitPrice !== null) {
    return unitPrice;
  }

  const quantity = resolveLineItemQuantity(item);
  if (quantity <= 0) {
    return resolveLineItemTotalAmount(item);
  }

  return resolveLineItemTotalAmount(item) / quantity;
};

export const resolveCartTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0;
  }

  const total = asFiniteNumber(cart.total);
  if (total !== null) {
    return total;
  }

  const subtotal = asFiniteNumber(cart.subtotal);
  if (subtotal !== null) {
    return subtotal;
  }

  return (
    cart.items?.reduce(
      (sum, item) => sum + resolveLineItemTotalAmount(item),
      0,
    ) ?? 0
  );
};

export const resolveCartSubtotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0;
  }

  const subtotal = asFiniteNumber(cart.subtotal);
  if (subtotal !== null) {
    return subtotal;
  }

  const itemSubtotal = asFiniteNumber(
    (cart as unknown as Record<string, unknown>).item_subtotal,
  );
  const shippingSubtotal = asFiniteNumber(
    (cart as unknown as Record<string, unknown>).shipping_subtotal,
  );

  if (itemSubtotal !== null || shippingSubtotal !== null) {
    return Math.max((itemSubtotal ?? 0) + (shippingSubtotal ?? 0), 0);
  }

  const total = asFiniteNumber(cart.total);
  if (total !== null) {
    const taxTotal = asFiniteNumber(cart.tax_total);
    const originalTaxTotal = asFiniteNumber(
      (cart as unknown as Record<string, unknown>).original_tax_total,
    );
    const resolvedTaxTotal = taxTotal ?? originalTaxTotal ?? 0;
    return Math.max(total - resolvedTaxTotal, 0);
  }

  return (
    cart.items?.reduce(
      (sum, item) => sum + (asFiniteNumber(item.subtotal) ?? resolveLineItemTotalAmount(item)),
      0,
    ) ?? 0
  );
};

export const resolveCartTaxAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0;
  }

  const taxTotal = asFiniteNumber(cart.tax_total);
  if (taxTotal !== null) {
    return Math.max(taxTotal, 0);
  }

  const originalTaxTotal = asFiniteNumber(
    (cart as unknown as Record<string, unknown>).original_tax_total,
  );
  if (originalTaxTotal !== null) {
    return Math.max(originalTaxTotal, 0);
  }

  const itemTaxTotal = asFiniteNumber(
    (cart as unknown as Record<string, unknown>).item_tax_total,
  );
  const shippingTaxTotal = asFiniteNumber(
    (cart as unknown as Record<string, unknown>).shipping_tax_total,
  );

  if (itemTaxTotal !== null || shippingTaxTotal !== null) {
    return Math.max((itemTaxTotal ?? 0) + (shippingTaxTotal ?? 0), 0);
  }

  return 0;
};

export const resolveCartTotalWithoutTaxAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0;
  }

  // `resolveCartSubtotalAmount` already resolves the pre-tax subtotal from the
  // best available cart fields (or derives it from total-tax fallback).
  return resolveCartSubtotalAmount(cart);
};

export const resolveCartItemName = (item: HttpTypes.StoreCartLineItem) => {
  return item.title ?? item.product_title ?? item.variant_title ?? item.id;
};
