import type { HttpTypes } from "@medusajs/types";
import { buildCategoryContextImageTiles } from "@/components/category/category-context-image-tile-grid";
import {
  normalizeCategoryName,
  resolveCategoryRank,
} from "@/components/category/category-product-utils";

const CATEGORY_DESCRIPTION_PLACEHOLDERS = new Set([
  "Imported from Herbatica XML feed.",
  "Imported from Herbatica category export.",
]);

const sortCategories = (categories: HttpTypes.StoreProductCategory[]) => {
  return [...categories].sort((left, right) => {
    const rankDifference =
      resolveCategoryRank(left) - resolveCategoryRank(right);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return normalizeCategoryName(left.name).localeCompare(
      normalizeCategoryName(right.name),
      "sk",
    );
  });
};

type ResolveCategoryIntroTextInput = {
  activeCategory: HttpTypes.StoreProductCategory | null;
};

export const resolveCategoryIntroText = ({
  activeCategory,
}: ResolveCategoryIntroTextInput) => {
  const description = activeCategory?.description?.trim();
  if (!description || CATEGORY_DESCRIPTION_PLACEHOLDERS.has(description)) {
    return null;
  }

  return description;
};

type ResolveCategoryContextTilesInput = {
  activeCategory: HttpTypes.StoreProductCategory | null;
  activeCategoryFilterIds: string[];
  categories: HttpTypes.StoreProductCategory[];
  categoryById: Map<string, HttpTypes.StoreProductCategory>;
};

export const resolveCategoryContextImageTiles = ({
  activeCategory,
  activeCategoryFilterIds,
  categories,
  categoryById,
}: ResolveCategoryContextTilesInput) => {
  if (!activeCategory) {
    return [];
  }

  const directChildren = sortCategories(
    categories.filter((category) => {
      return (
        category.parent_category_id === activeCategory.id &&
        Boolean(category.handle)
      );
    }),
  ).map((category) => ({
    id: category.id,
    label: normalizeCategoryName(category.name),
    href: `/c/${category.handle}`,
    handle: category.handle,
    parentCategoryId: category.parent_category_id ?? null,
  }));

  if (directChildren.length > 0) {
    return buildCategoryContextImageTiles({
      categories: directChildren,
      categoryById,
    });
  }

  const descendants = sortCategories(
    activeCategoryFilterIds
      .map((categoryId) => categoryById.get(categoryId) ?? null)
      .filter((category): category is HttpTypes.StoreProductCategory => {
        if (!category || !category.handle) {
          return false;
        }

        return category.id !== activeCategory.id;
      }),
  )
    .slice(0, 8)
    .map((category) => ({
      id: category.id,
      label: normalizeCategoryName(category.name),
      href: `/c/${category.handle}`,
      handle: category.handle,
      parentCategoryId: category.parent_category_id ?? null,
    }));

  return buildCategoryContextImageTiles({
    categories: descendants,
    categoryById,
  });
};
