import type { HttpTypes } from "@medusajs/types";
import { buildCategoryContextTiles } from "@/components/category/category-context-panel";
import {
  normalizeCategoryName,
  resolveCategoryRank,
} from "@/components/category/category-product-utils";

type CategoryContextPreset = {
  introText: string;
  preferredTiles: Array<{
    handle: string;
    label: string;
  }>;
};

const CATEGORY_DESCRIPTION_PLACEHOLDER = "Imported from Herbatica XML feed.";

const CATEGORY_CONTEXT_PRESETS: Record<string, CategoryContextPreset> = {
  "trapi-ma": {
    introText:
      "Človek je neoddeliteľnou súčasťou prírody, každá jedna bunka je s ňou prepojená a závislá od jej ďalších zložiek: vody, vzduchu, stromov, rastlín a ďalších živých tvorov na zemi. Spôsob, akým k nej pristupujeme, sa odráža aj na našom zdraví. Trápi vás oslabená imunita, kožné problémy, únava alebo bolesti kĺbov? V Herbatica sme pre vás pripravili jedinečnú kategóriu Trápi ma, v ktorej nájdete prírodné produkty rozdelené podľa účelu a oblasti zdravia.",
    preferredTiles: [
      { handle: "trapi-ma-kozne-problemy", label: "Kožné problémy" },
      {
        handle: "trapi-ma-mozog-a-nervovy-system",
        label: "Mozog a nervový systém",
      },
      { handle: "trapi-ma-imunita-a-obranyschopnost", label: "Imunita" },
      { handle: "trapi-ma-klby-a-pohybovy-aparat", label: "Kĺby a pohyb" },
      {
        handle: "trapi-ma-travenie-a-metabolizmus",
        label: "Trávenie a metabolizmus",
      },
      { handle: "trapi-ma-srdce-a-cievy", label: "Srdce a cievy" },
      {
        handle: "trapi-ma-hormonalna-rovnovaha",
        label: "Hormonálna rovnováha",
      },
      {
        handle: "trapi-ma-hormonalna-rovnovaha-zenske-zdravie",
        label: "Ženské zdravie",
      },
    ],
  },
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
  const presetIntro = CATEGORY_CONTEXT_PRESETS[slug]?.introText;
  if (presetIntro) {
    return presetIntro;
  }

  const description = activeCategory?.description?.trim();
  if (!description || description === CATEGORY_DESCRIPTION_PLACEHOLDER) {
    return null;
  }

  return description;
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
