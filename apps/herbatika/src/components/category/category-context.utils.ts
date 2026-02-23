import type { HttpTypes } from "@medusajs/types";
import { buildCategoryContextTiles } from "@/components/category/category-context-panel";
import {
  CATEGORY_CONTEXT_PRESETS,
  type CategoryContextIntroSegmentPreset,
} from "@/components/category/category-context.data";
import {
  normalizeCategoryName,
  resolveCategoryRank,
} from "@/components/category/category-product-utils";

export type CategoryContextIntroSegment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "link";
      value: string;
      href: string;
    };

const CATEGORY_DESCRIPTION_PLACEHOLDER = "Imported from Herbatica XML feed.";

const resolveIntroTextFromSegments = (
  segments: CategoryContextIntroSegmentPreset[],
) => {
  return segments.map((segment) => segment.value).join("");
};

const resolveIntroLinkHref = ({
  slug,
  categoryByHandle,
  segment,
}: {
  slug: string;
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>;
  segment: Extract<CategoryContextIntroSegmentPreset, { type: "link" }>;
}) => {
  if (segment.href) {
    return segment.href;
  }

  if (segment.handle) {
    const categoryHandle = categoryByHandle.get(segment.handle)?.handle ?? segment.handle;
    return `/c/${categoryHandle}`;
  }

  return `/c/${slug}`;
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

type ResolveCategoryIntroTextInput = {
  slug: string;
  activeCategory: HttpTypes.StoreProductCategory | null;
};

export const resolveCategoryIntroText = ({
  slug,
  activeCategory,
}: ResolveCategoryIntroTextInput) => {
  const presetIntroSegments = CATEGORY_CONTEXT_PRESETS[slug]?.introSegments ?? [];
  if (presetIntroSegments.length > 0) {
    return resolveIntroTextFromSegments(presetIntroSegments);
  }

  const description = activeCategory?.description?.trim();
  if (!description || description === CATEGORY_DESCRIPTION_PLACEHOLDER) {
    return null;
  }

  return description;
};

type ResolveCategoryIntroSegmentsInput = {
  slug: string;
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>;
};

export const resolveCategoryIntroSegments = ({
  slug,
  categoryByHandle,
}: ResolveCategoryIntroSegmentsInput): CategoryContextIntroSegment[] | null => {
  const presetIntroSegments = CATEGORY_CONTEXT_PRESETS[slug]?.introSegments ?? [];
  if (presetIntroSegments.length === 0) {
    return null;
  }

  return presetIntroSegments.map((segment) => {
    if (segment.type === "text") {
      return segment;
    }

    return {
      type: "link",
      value: segment.value,
      href: resolveIntroLinkHref({ slug, categoryByHandle, segment }),
    };
  });
};

type ResolveCategoryContextTilesInput = {
  slug: string;
  activeCategory: HttpTypes.StoreProductCategory | null;
  activeCategoryFilterIds: string[];
  categories: HttpTypes.StoreProductCategory[];
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>;
  categoryById: Map<string, HttpTypes.StoreProductCategory>;
};

export const resolveCategoryContextTiles = ({
  slug,
  activeCategory,
  activeCategoryFilterIds,
  categories,
  categoryByHandle,
  categoryById,
}: ResolveCategoryContextTilesInput) => {
  if (!activeCategory) {
    return [];
  }

  const presetTilesConfig = CATEGORY_CONTEXT_PRESETS[slug]?.preferredTiles ?? [];
  if (presetTilesConfig.length > 0) {
    const presetTiles = presetTilesConfig
      .map((tileConfig) => {
        const category = categoryByHandle.get(tileConfig.handle) ?? null;
        if (!category?.handle) {
          return null;
        }

        return {
          id: category.id,
          label: tileConfig.label,
          href: `/c/${category.handle}`,
          handle: category.handle,
        };
      })
      .filter(
        (
          tile,
        ): tile is {
          id: string;
          label: string;
          href: string;
          handle: string;
        } => Boolean(tile),
      );

    if (presetTiles.length > 0) {
      return buildCategoryContextTiles(presetTiles);
    }
  }

  const directChildren = sortCategories(
    categories.filter((category) => {
      return (
        category.parent_category_id === activeCategory.id &&
        Boolean(category.handle)
      );
    }),
  )
    .slice(0, 8)
    .map((category) => ({
      id: category.id,
      label: normalizeCategoryName(category.name),
      href: `/c/${category.handle}`,
      handle: category.handle,
    }));

  if (directChildren.length > 0) {
    return buildCategoryContextTiles(directChildren);
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
    }));

  return buildCategoryContextTiles(descendants);
};
