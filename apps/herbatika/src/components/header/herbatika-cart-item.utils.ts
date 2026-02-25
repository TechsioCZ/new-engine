import type { HttpTypes } from "@medusajs/types";
import { asFiniteNumber } from "@/lib/storefront/cart-calculations";

export const FALLBACK_MAX_QUANTITY = 99;

export const resolveLineItemHref = (item: HttpTypes.StoreCartLineItem) => {
  const itemRecord = item as unknown as Record<string, unknown>;
  const productHandle =
    typeof itemRecord.product_handle === "string"
      ? itemRecord.product_handle
      : null;

  if (productHandle) {
    return `/p/${productHandle}`;
  }

  return "/checkout/kosik";
};

export const resolveLineItemInventory = (item: HttpTypes.StoreCartLineItem) => {
  const itemRecord = item as unknown as Record<string, unknown>;
  const metadata =
    itemRecord.metadata &&
    typeof itemRecord.metadata === "object" &&
    !Array.isArray(itemRecord.metadata)
      ? (itemRecord.metadata as Record<string, unknown>)
      : null;
  const variant =
    itemRecord.variant &&
    typeof itemRecord.variant === "object" &&
    !Array.isArray(itemRecord.variant)
      ? (itemRecord.variant as Record<string, unknown>)
      : null;

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

  return "/file.svg";
};
