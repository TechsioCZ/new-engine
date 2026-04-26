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

const SHOW_MORE_MARKER_PATTERN = /#showmore#/gi;
const SHOW_MORE_MARKER_PARAGRAPH_PATTERN =
  /<p[^>]*>\s*(?:<span[^>]*>)?\s*#showmore#\s*(?:<\/span>)?\s*<\/p>/gi;
const HERBATICA_LEGACY_HOSTNAMES = new Set([
  "herbatica.sk",
  "www.herbatica.sk",
]);

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

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

type ResolveCategoryHtmlInput = ResolveCategoryIntroTextInput & {
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>;
};

const stripShowMoreMarker = (html: string) => {
  return html
    .replace(SHOW_MORE_MARKER_PARAGRAPH_PATTERN, "")
    .replace(SHOW_MORE_MARKER_PATTERN, "")
    .trim();
};

const resolveLegacyCategoryHref = (
  href: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
) => {
  const trimmedHref = href.trim();
  if (!trimmedHref || trimmedHref.startsWith("#")) {
    return href;
  }

  let pathname = trimmedHref;

  try {
    const url = new URL(trimmedHref);
    if (!HERBATICA_LEGACY_HOSTNAMES.has(url.hostname)) {
      return href;
    }

    pathname = url.pathname;
  } catch {
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedHref)) {
      return href;
    }
  }

  const normalizedPath = pathname.replace(/^\/+|\/+$/g, "");
  if (!normalizedPath || normalizedPath.startsWith("c/")) {
    return href;
  }

  const [handle] = normalizedPath.split("/");
  if (!handle || !categoryByHandle.has(handle)) {
    return href;
  }

  return `/c/${handle}`;
};

const rewriteLegacyCategoryLinks = (
  html: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
) => {
  return html.replace(
    /\bhref=(["'])(.*?)\1/gi,
    (_match, quote: string, href: string) => {
      return `href=${quote}${resolveLegacyCategoryHref(
        href,
        categoryByHandle,
      )}${quote}`;
    },
  );
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

const resolveCategoryMetadataHtml = ({
  activeCategory,
  categoryByHandle,
  field,
}: ResolveCategoryHtmlInput & {
  field: "bottom_description_html" | "top_description_html";
}) => {
  const metadata = asRecord(activeCategory?.metadata);
  const html = asString(metadata?.[field]);
  if (!html) {
    return null;
  }

  return rewriteLegacyCategoryLinks(stripShowMoreMarker(html), categoryByHandle);
};

export const resolveCategoryIntroHtml = (input: ResolveCategoryHtmlInput) =>
  resolveCategoryMetadataHtml({ ...input, field: "top_description_html" });

export const resolveCategoryBottomHtml = (input: ResolveCategoryHtmlInput) =>
  resolveCategoryMetadataHtml({ ...input, field: "bottom_description_html" });

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
