import type { HttpTypes } from "@medusajs/types";
import { resolveLineItemQuantity } from "./cart-calculations";
import {
  resolveBusinessDayDeliveryLabel,
  resolveOfferStockAmount,
  resolveTopOffer,
} from "./offer-utils";
import { asFiniteNumber, asRecord, asString } from "./value-utils";

export const FALLBACK_MAX_QUANTITY = 99;

const DEFAULT_CHECKOUT_LINE_ITEM_HREF = "/checkout/kosik";
const DEFAULT_LINE_ITEM_THUMBNAIL = "/file.svg";
const DEFAULT_IN_STOCK_LABEL = "Na sklade";
const DEFAULT_OUT_OF_STOCK_LABEL = "Moment\u00e1lne nie je skladom";

const resolveLineItemMetadata = (item: HttpTypes.StoreCartLineItem) => {
  return asRecord((item as unknown as Record<string, unknown>).metadata);
};

const resolveLineItemVariantRecord = (item: HttpTypes.StoreCartLineItem) => {
  return asRecord((item as unknown as Record<string, unknown>).variant);
};

export const resolveLineItemProductHandle = (
  item: HttpTypes.StoreCartLineItem,
) => {
  const itemRecord = item as unknown as Record<string, unknown>;
  return typeof itemRecord.product_handle === "string"
    ? itemRecord.product_handle
    : null;
};

export const resolveLineItemHref = (item: HttpTypes.StoreCartLineItem) => {
  const productHandle = resolveLineItemProductHandle(item);

  if (productHandle) {
    return `/p/${productHandle}`;
  }

  return DEFAULT_CHECKOUT_LINE_ITEM_HREF;
};

export const resolveLineItemInventory = (item: HttpTypes.StoreCartLineItem) => {
  const itemRecord = item as unknown as Record<string, unknown>;
  const metadata = resolveLineItemMetadata(item);
  const variant = resolveLineItemVariantRecord(item);

  const metadataInventory = asFiniteNumber(metadata?.inventory_quantity);
  if (metadataInventory !== null) {
    return metadataInventory;
  }

  const variantInventory = asFiniteNumber(variant?.inventory_quantity);
  if (variantInventory !== null) {
    return variantInventory;
  }

  return asFiniteNumber(itemRecord.variant_inventory_quantity);
};

export const resolveLineItemThumbnail = (item: HttpTypes.StoreCartLineItem) => {
  if (typeof item.thumbnail === "string" && item.thumbnail.length > 0) {
    return item.thumbnail;
  }

  return DEFAULT_LINE_ITEM_THUMBNAIL;
};

export const resolveLineItemMaxQuantity = (
  item: HttpTypes.StoreCartLineItem,
) => {
  const baseQuantity = resolveLineItemQuantity(item);
  return Math.max(
    baseQuantity,
    resolveLineItemInventory(item) ?? FALLBACK_MAX_QUANTITY,
  );
};

export const normalizeLineItemQuantity = (
  quantity: number,
  maxQuantity: number,
) => {
  return Math.max(1, Math.min(Math.round(quantity), maxQuantity));
};

export const resolveLineItemOriginalTotalAmount = (
  item: HttpTypes.StoreCartLineItem,
) => {
  const itemRecord = item as unknown as Record<string, unknown>;
  const compareAtUnit = asFiniteNumber(itemRecord.compare_at_unit_price);
  if (compareAtUnit === null) {
    return null;
  }

  return compareAtUnit * resolveLineItemQuantity(item);
};

export const resolveLineItemAvailabilityText = (
  item: HttpTypes.StoreCartLineItem,
) => {
  const topOffer = resolveTopOffer(resolveLineItemMetadata(item));
  const stockAmount =
    resolveOfferStockAmount(topOffer) ?? resolveLineItemInventory(item);
  const isInStock = stockAmount === null ? true : stockAmount > 0;

  if (!isInStock) {
    return (
      asString(topOffer?.availability_out_of_stock) ??
      DEFAULT_OUT_OF_STOCK_LABEL
    );
  }

  const availabilityLabel =
    asString(topOffer?.availability_in_stock) ?? DEFAULT_IN_STOCK_LABEL;
  const deliveryLabel =
    asString(topOffer?.delivery_label) ?? resolveBusinessDayDeliveryLabel();

  return `${availabilityLabel}, ${deliveryLabel}`;
};
