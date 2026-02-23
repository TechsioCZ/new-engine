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

  return (
    cart.items?.reduce(
      (sum, item) => sum + resolveLineItemTotalAmount(item),
      0,
    ) ?? 0
  );
};

export const resolveCartItemName = (item: HttpTypes.StoreCartLineItem) => {
  return item.title ?? item.product_title ?? item.variant_title ?? item.id;
};
