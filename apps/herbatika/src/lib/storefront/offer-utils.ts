import type { HttpTypes } from "@medusajs/types";
import { asRecord } from "./value-utils";

type StorefrontOfferSource = Record<string, unknown>;

const DEFAULT_DELIVERY_BUSINESS_DAYS = 3;

const formatSkShortDate = (date: Date) => {
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

export const resolveBusinessDayDeliveryLabel = (
  businessDaysToAdd = DEFAULT_DELIVERY_BUSINESS_DAYS,
) => {
  const deliveryDate = addBusinessDays(new Date(), businessDaysToAdd);
  return `u v\u00e1s do ${formatSkShortDate(deliveryDate)}`;
};

export const resolveTopOffer = (
  metadata: unknown,
): StorefrontOfferSource | null => {
  return asRecord(asRecord(metadata)?.top_offer);
};

export const resolveVariantOfferSource = (
  variant: Pick<HttpTypes.StoreProductVariant, "metadata"> | null | undefined,
): StorefrontOfferSource | null => {
  return asRecord(variant?.metadata);
};

export const resolveProductOfferSource = (
  product: Pick<HttpTypes.StoreProduct, "metadata"> | null | undefined,
  selectedVariant:
    | Pick<HttpTypes.StoreProductVariant, "metadata">
    | null
    | undefined,
): StorefrontOfferSource | null => {
  return (
    resolveTopOffer(product?.metadata) ??
    resolveVariantOfferSource(selectedVariant)
  );
};

export const resolveOfferStockAmount = (source: unknown): number | null => {
  const stock = asRecord(asRecord(source)?.stock);
  const amount = stock?.amount;

  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
};

export const resolveOfferInStock = (source: unknown) => {
  const stockAmount = resolveOfferStockAmount(source);
  return stockAmount === null ? true : stockAmount > 0;
};
