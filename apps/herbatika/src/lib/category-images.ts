import type { HttpTypes } from "@medusajs/types";
import type { StaticImageData } from "next/image";
import {
  categoryImagesBySlug,
  type CategoryImageSlug,
} from "@/assets/categories-images";

export type ResolveCategoryImageInput = {
  categoryById?: ReadonlyMap<string, HttpTypes.StoreProductCategory>;
  handle?: string | null;
  label?: string | null;
  parentCategoryId?: string | null;
};

export const normalizeCategoryImageKey = (value: string) => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const CATEGORY_IMAGE_HANDLE_PREFIXES = [
  "trapi-ma-",
  "prirodna-kozmetika-",
  "doplnky-vyzivy-",
  "potraviny-a-napoje-",
  "eko-domacnost-",
  "ucinne-zlozky-od-a-po-z-",
] as const;

export const CATEGORY_IMAGE_ALIASES_BY_HANDLE = {
  "ine-podpora-a-rast-vlasov": "vlasy-vypadavanie-lupiny",
  "potraviny-a-napoje-prirodne-a-zdrave-zuvacky": "prirodne-a-zdrave-zuvacky",
  "potraviny-a-napoje-sirupy-a-medy": "sirupy",
  "potraviny-a-napoje-zuvacky": "prirodne-a-zdrave-zuvacky",
  "prirodna-kozmetika-cbd": "cbd-2",
  "trapi-ma-imunita-a-obranyschopnost": "imunita",
} satisfies Record<string, CategoryImageSlug>;

export const CATEGORY_IMAGE_ALIASES_BY_LABEL = {
  cbd: "cbd-2",
  "imunita-a-obranyschopnost": "imunita",
  "podpora-a-rast-vlasov": "vlasy-vypadavanie-lupiny",
  "sirupy-a-medy": "sirupy",
  zuvacky: "prirodne-a-zdrave-zuvacky",
} satisfies Record<string, CategoryImageSlug>;

const resolveImageBySlug = (slug?: string | null): StaticImageData | undefined => {
  if (!slug) {
    return undefined;
  }

  const normalizedSlug = normalizeCategoryImageKey(slug);
  if (
    Object.prototype.hasOwnProperty.call(categoryImagesBySlug, normalizedSlug)
  ) {
    return categoryImagesBySlug[normalizedSlug as CategoryImageSlug];
  }

  return undefined;
};

const resolveImageByPrefixedHandle = (
  handle?: string | null,
): StaticImageData | undefined => {
  if (!handle) {
    return undefined;
  }

  const normalizedHandle = normalizeCategoryImageKey(handle);
  for (const prefix of CATEGORY_IMAGE_HANDLE_PREFIXES) {
    if (normalizedHandle.startsWith(prefix)) {
      return resolveImageBySlug(normalizedHandle.slice(prefix.length));
    }
  }

  return undefined;
};

const resolveImageByAlias = (
  aliasMap: Record<string, CategoryImageSlug>,
  value?: string | null,
): StaticImageData | undefined => {
  if (!value) {
    return undefined;
  }

  const normalizedValue = normalizeCategoryImageKey(value);
  const aliasSlug = aliasMap[normalizedValue];
  if (!aliasSlug) {
    return undefined;
  }

  return categoryImagesBySlug[aliasSlug];
};

const resolveOwnCategoryImage = ({
  handle,
  label,
}: Pick<ResolveCategoryImageInput, "handle" | "label">) => {
  return (
    resolveImageBySlug(handle) ??
    resolveImageByPrefixedHandle(handle) ??
    resolveImageByAlias(CATEGORY_IMAGE_ALIASES_BY_HANDLE, handle) ??
    resolveImageBySlug(label) ??
    resolveImageByAlias(CATEGORY_IMAGE_ALIASES_BY_LABEL, label)
  );
};

export const resolveCategoryImage = ({
  categoryById,
  handle,
  label,
  parentCategoryId,
}: ResolveCategoryImageInput): StaticImageData | undefined => {
  const ownImage = resolveOwnCategoryImage({ handle, label });
  if (ownImage) {
    return ownImage;
  }

  if (!parentCategoryId || !categoryById) {
    return undefined;
  }

  let currentParentId: string | null = parentCategoryId;
  const visitedCategoryIds = new Set<string>();

  while (currentParentId && !visitedCategoryIds.has(currentParentId)) {
    visitedCategoryIds.add(currentParentId);

    const parentCategory = categoryById.get(currentParentId);
    if (!parentCategory) {
      return undefined;
    }

    const parentImage = resolveOwnCategoryImage({
      handle: parentCategory.handle,
      label: parentCategory.name,
    });
    if (parentImage) {
      return parentImage;
    }

    currentParentId = parentCategory.parent_category_id ?? null;
  }

  return undefined;
};
