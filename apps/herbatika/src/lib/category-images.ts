import type { HttpTypes } from "@medusajs/types"
import type { StaticImageData } from "next/image"

import { categoryImagesBySlug } from "@/assets/categories-images"
import type { CategoryImageSlug } from "@/assets/categories-images"

export interface ResolveCategoryImageInput {
  categoryById?: ReadonlyMap<string, HttpTypes.StoreProductCategory>
  handle?: string | null
  label?: string | null
  parentCategoryId?: string | null
}

const HEALTHY_GUM_SLUG = "prirodne-a-zdrave-zuvacky"

const normalizeCategoryImageKey = (value: string) =>
  value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")

const isCategoryImageSlug = (value: string): value is CategoryImageSlug =>
  Object.hasOwn(categoryImagesBySlug, value)

const CATEGORY_IMAGE_HANDLE_PREFIXES = [
  "trapi-ma-",
  "prirodna-kozmetika-",
  "doplnky-vyzivy-",
  "potraviny-a-napoje-",
  "eko-domacnost-",
  "ucinne-zlozky-od-a-po-z-",
] as const

const CATEGORY_IMAGE_ALIASES_BY_HANDLE = {
  "ine-podpora-a-rast-vlasov": "vlasy-vypadavanie-lupiny",
  "potraviny-a-napoje-prirodne-a-zdrave-zuvacky": HEALTHY_GUM_SLUG,
  "potraviny-a-napoje-sirupy-a-medy": "sirupy",
  "potraviny-a-napoje-zuvacky": HEALTHY_GUM_SLUG,
  "prirodna-kozmetika-cbd": "cbd-2",
  "trapi-ma-imunita-a-obranyschopnost": "imunita",
} satisfies Record<string, CategoryImageSlug>

const CATEGORY_IMAGE_ALIASES_BY_LABEL = {
  cbd: "cbd-2",
  "imunita-a-obranyschopnost": "imunita",
  "podpora-a-rast-vlasov": "vlasy-vypadavanie-lupiny",
  "sirupy-a-medy": "sirupy",
  zuvacky: HEALTHY_GUM_SLUG,
} satisfies Record<string, CategoryImageSlug>

const resolveImageBySlug = (
  slug?: string | null,
): StaticImageData | undefined => {
  if (slug === undefined || slug === null || slug === "") {
    return undefined
  }

  const normalizedSlug = normalizeCategoryImageKey(slug)
  return isCategoryImageSlug(normalizedSlug)
    ? categoryImagesBySlug[normalizedSlug]
    : undefined
}

const resolveImageByPrefixedHandle = (
  handle?: string | null,
): StaticImageData | undefined => {
  if (handle === undefined || handle === null || handle === "") {
    return undefined
  }

  const normalizedHandle = normalizeCategoryImageKey(handle)
  for (const prefix of CATEGORY_IMAGE_HANDLE_PREFIXES) {
    if (normalizedHandle.startsWith(prefix)) {
      return resolveImageBySlug(normalizedHandle.slice(prefix.length))
    }
  }

  return undefined
}

const resolveImageByAlias = (
  aliasMap: Record<string, CategoryImageSlug>,
  value?: string | null,
): StaticImageData | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const normalizedValue = normalizeCategoryImageKey(value)
  const aliasSlug = aliasMap[normalizedValue]
  return aliasSlug === undefined ? undefined : categoryImagesBySlug[aliasSlug]
}

const resolveOwnCategoryImage = ({
  handle,
  label,
}: Pick<ResolveCategoryImageInput, "handle" | "label">) => {
  const handleImage =
    resolveImageBySlug(handle) ??
    resolveImageByPrefixedHandle(handle) ??
    resolveImageByAlias(CATEGORY_IMAGE_ALIASES_BY_HANDLE, handle)

  return (
    handleImage ??
    resolveImageBySlug(label) ??
    resolveImageByAlias(CATEGORY_IMAGE_ALIASES_BY_LABEL, label)
  )
}

export const resolveCategoryImage = ({
  categoryById,
  handle,
  label,
  parentCategoryId,
}: ResolveCategoryImageInput): StaticImageData | undefined => {
  const ownImage = resolveOwnCategoryImage({
    ...(handle === undefined ? {} : { handle }),
    ...(label === undefined ? {} : { label }),
  })
  if (ownImage) {
    return ownImage
  }

  if (
    parentCategoryId === undefined ||
    parentCategoryId === null ||
    parentCategoryId === "" ||
    categoryById === undefined
  ) {
    return undefined
  }

  let currentParentId: string | null = parentCategoryId
  const visitedCategoryIds = new Set<string>()

  while (
    currentParentId !== null &&
    currentParentId !== "" &&
    !visitedCategoryIds.has(currentParentId)
  ) {
    visitedCategoryIds.add(currentParentId)

    const parentCategory = categoryById.get(currentParentId)
    if (!parentCategory) {
      return undefined
    }

    const parentImage = resolveOwnCategoryImage({
      handle: parentCategory.handle,
      label: parentCategory.name,
    })
    if (parentImage) {
      return parentImage
    }

    currentParentId = parentCategory.parent_category_id ?? null
  }

  return undefined
}
