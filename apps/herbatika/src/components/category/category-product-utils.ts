import type { HttpTypes } from "@medusajs/types";

export const normalizeCategoryName = (value?: string | null) => {
  if (!value) {
    return "Kategória";
  }

  return value.replace(/^>\s*/, "").trim();
};

export const resolveCategoryRank = (
  category: HttpTypes.StoreProductCategory,
) => {
  if (typeof category.rank === "number") {
    return category.rank;
  }

  return Number.MAX_SAFE_INTEGER;
};
