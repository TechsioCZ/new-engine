import { createBrandHref } from "@/lib/storefront/brands"
import {
  createHandleLabel,
  normalizeString,
  resolveBrandSlug,
} from "./search-autocomplete-normalizers"
import type {
  RawSearchAutocompleteBrandRef,
  RawSearchAutocompleteCategoryRef,
  SearchAutocompleteSuggestion,
} from "./search-autocomplete-types"

const createCategorySuggestion = (
  category: RawSearchAutocompleteCategoryRef
): SearchAutocompleteSuggestion | null => {
  const id = normalizeString(category.id)
  const handle = normalizeString(category.handle)
  const title = normalizeString(category.name) || createHandleLabel(handle)

  if (!(id && handle && title)) {
    return null
  }

  return {
    id,
    type: "category",
    title,
    href: `/c/${handle}`,
    subtitle: "Kategória",
  }
}

export const createCategorySuggestions = ({
  categoryHits,
}: {
  categoryHits: RawSearchAutocompleteCategoryRef[]
}) =>
  categoryHits
    .map(createCategorySuggestion)
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item))

const createBrandSuggestion = (
  brand: RawSearchAutocompleteBrandRef
): SearchAutocompleteSuggestion | null => {
  const title = normalizeString(brand.title)
  const handle = normalizeString(brand.handle)
  const slug = resolveBrandSlug(handle, title)
  const id = normalizeString(brand.id) || slug

  if (!(id && title && slug)) {
    return null
  }

  return {
    id,
    type: "brand",
    title,
    href: createBrandHref({ slug }),
    subtitle: "Značka",
  }
}

export const createBrandSuggestions = ({
  brandHits,
}: {
  brandHits: RawSearchAutocompleteBrandRef[]
}) =>
  brandHits
    .map(createBrandSuggestion)
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item))
