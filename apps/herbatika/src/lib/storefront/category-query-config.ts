import type { HttpTypes } from "@medusajs/types";
import type { FindParams } from "@medusajs/types";

export const DEFAULT_CATEGORY_PAGE_SIZE = 24;

export type StorefrontCategoryListInput = FindParams &
  HttpTypes.StoreProductCategoryListParams & {
    page?: number;
  };

export const buildCategoryListParams = (
  input: StorefrontCategoryListInput,
): FindParams & HttpTypes.StoreProductCategoryListParams => {
  const { page, limit, offset, ...rest } = input;

  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : DEFAULT_CATEGORY_PAGE_SIZE;
  const resolvedPage = typeof page === "number" && page > 0 ? page : 1;

  return {
    ...rest,
    limit: resolvedLimit,
    offset:
      typeof offset === "number" ? offset : (resolvedPage - 1) * resolvedLimit,
  };
};
