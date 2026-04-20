"use client";

import type { HttpTypes } from "@medusajs/types";
import { useMemo } from "react";
import {
  normalizeCategoryName,
  resolveCategoryRank,
} from "@/components/category/category-product-utils";
import {
  STOREFRONT_CATEGORY_TREE_FIELDS,
  STOREFRONT_CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config";
import { useCategories } from "@/lib/storefront/categories";
import {
  HERBATIKA_HEADER_SUBMENU_GROUPS,
  type HerbatikaHeaderSubmenuFeaturedItemConfig,
} from "./herbatika-header.submenu-data";

type HerbatikaHeaderSubmenuChildItem = {
  id: string;
  label: string;
  href: string;
};

type HerbatikaHeaderSubmenuFeaturedItem =
  HerbatikaHeaderSubmenuFeaturedItemConfig & {
    href: string;
    childItems: HerbatikaHeaderSubmenuChildItem[];
  };

type HerbatikaHeaderSubmenuGroup = {
  rootHandle: string;
  featuredItems: HerbatikaHeaderSubmenuFeaturedItem[];
};

const sortCategories = (categories: HttpTypes.StoreProductCategory[]) => {
  return [...categories].sort((left, right) => {
    const rankDifference = resolveCategoryRank(left) - resolveCategoryRank(right);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return normalizeCategoryName(left.name).localeCompare(
      normalizeCategoryName(right.name),
      "sk",
    );
  });
};

export function useHerbatikaHeaderSubmenu() {
  const categoriesQuery = useCategories({
    page: 1,
    limit: STOREFRONT_CATEGORY_TREE_LIMIT,
    fields: STOREFRONT_CATEGORY_TREE_FIELDS,
  });

  const categoryByHandle = useMemo(() => {
    const map = new Map<string, HttpTypes.StoreProductCategory>();

    for (const category of categoriesQuery.categories) {
      if (category.handle) {
        map.set(category.handle, category);
      }
    }

    return map;
  }, [categoriesQuery.categories]);

  const childrenByParentId = useMemo(() => {
    const map = new Map<string, HttpTypes.StoreProductCategory[]>();

    for (const category of categoriesQuery.categories) {
      if (!category.parent_category_id || !category.handle) {
        continue;
      }

      const siblings = map.get(category.parent_category_id) ?? [];
      siblings.push(category);
      map.set(category.parent_category_id, siblings);
    }

    for (const [parentId, children] of map) {
      map.set(parentId, sortCategories(children));
    }

    return map;
  }, [categoriesQuery.categories]);

  const groupsByRootHandle = useMemo(() => {
    return new Map<string, HerbatikaHeaderSubmenuGroup>(
      HERBATIKA_HEADER_SUBMENU_GROUPS.map((group) => [
        group.rootHandle,
        {
          rootHandle: group.rootHandle,
          featuredItems: group.featuredItems.map((item) => {
            const featuredCategory = categoryByHandle.get(item.handle) ?? null;
            const childItems = featuredCategory
              ? (childrenByParentId.get(featuredCategory.id) ?? []).map((child) => ({
                  id: child.id,
                  label: normalizeCategoryName(child.name),
                  href: `/c/${child.handle}`,
                }))
              : [];

            return {
              ...item,
              href: `/c/${item.handle}`,
              childItems,
            };
          }),
        },
      ]),
    );
  }, [categoryByHandle, childrenByParentId]);

  return {
    categoriesQuery,
    groupsByRootHandle,
  };
}
