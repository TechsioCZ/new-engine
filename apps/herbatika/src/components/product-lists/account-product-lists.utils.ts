import type { HttpTypes } from "@medusajs/types";
import {
  getProductListTitle,
  isFavoriteProductList,
  type StoreProductList,
  type StoreProductListItem,
} from "@/lib/storefront/product-lists";

export const sortProductLists = (lists: StoreProductList[]) => {
  return [...lists].sort((first, second) => {
    if (isFavoriteProductList(first)) {
      return -1;
    }

    if (isFavoriteProductList(second)) {
      return 1;
    }

    return getProductListTitle(first).localeCompare(getProductListTitle(second));
  });
};

export const uniqueProductIds = (items: StoreProductListItem[]) => {
  return Array.from(
    new Set(
      items
        .map((item) => item.product_id ?? item.product?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
};

export const buildProductMap = (
  items: StoreProductListItem[],
  products: HttpTypes.StoreProduct[],
) => {
  const map = new Map<string, HttpTypes.StoreProduct>();

  for (const item of items) {
    if (item.product?.id) {
      map.set(item.product.id, item.product);
    }
  }

  for (const product of products) {
    map.set(product.id, product);
  }

  return map;
};
