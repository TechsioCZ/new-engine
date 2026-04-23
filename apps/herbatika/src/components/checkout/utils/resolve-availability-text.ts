import { resolveLineItemInventory } from "@/components/header/herbatika-cart-item.utils";
import { asFiniteNumber, resolveLineItemQuantity } from "@/lib/storefront/cart-calculations";
import { HttpTypes } from "@medusajs/types";


export const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

export const toSkDate = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

export const addBusinessDays = (start: Date, daysToAdd: number) => {
  const date = new Date(start);
  let remainingDays = daysToAdd;

  while (remainingDays > 0) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingDays -= 1;
    }
  }

  return date;
};

export const resolveFallbackDeliveryLabel = () => {
  const deliveryDate = addBusinessDays(new Date(), 3);
  return `u Vás do ${toSkDate(deliveryDate)}`;
};

export const resolveOriginalLineItemTotalAmount = (
  item: HttpTypes.StoreCartLineItem,
) => {
  const itemRecord = item as unknown as Record<string, unknown>;
  const compareAtUnit = asFiniteNumber(itemRecord.compare_at_unit_price);
  if (compareAtUnit === null) {
    return null;
  }

  return compareAtUnit * resolveLineItemQuantity(item);
};

export const resolveAvailabilityText = (item: HttpTypes.StoreCartLineItem) => {
  const metadata = asRecord(
    (item as unknown as Record<string, unknown>).metadata,
  );
  const topOffer = asRecord(metadata?.top_offer);
  const stock = asRecord(topOffer?.stock);
  const stockAmount =
    asFiniteNumber(stock?.amount) ?? resolveLineItemInventory(item);
  const isInStock = stockAmount === null ? true : stockAmount > 0;

  if (!isInStock) {
    return (
      asString(topOffer?.availability_out_of_stock) ??
      "Momentálne nie je skladom"
    );
  }

  const availabilityLabel =
    asString(topOffer?.availability_in_stock) ?? "Na sklade";
  const deliveryLabel =
    asString(topOffer?.delivery_label) ?? resolveFallbackDeliveryLabel();
  return `${availabilityLabel}, ${deliveryLabel}`;
};
