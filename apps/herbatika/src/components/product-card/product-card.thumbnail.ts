import type { HttpTypes } from "@medusajs/types";
import { PRODUCT_FALLBACK_IMAGE } from "./product-card.constants";

export const resolveThumbnail = (product: HttpTypes.StoreProduct): string => {
  return product.thumbnail || PRODUCT_FALLBACK_IMAGE;
};
