import { createBrandHref } from "@/lib/storefront/brands"
import {
  createHandleLabel,
  normalizeComparable,
  normalizeString,
  resolveBrandSlug,
} from "./search-autocomplete-normalizers"
import type {
  RawSearchAutocompleteBrandRef,
  RawSearchAutocompleteCategoryRef,
  RawSearchAutocompleteFacetItem,
  RawSearchAutocompleteProductHit,
  SearchAutocompleteSuggestion,
} from "./search-autocomplete-types"

const matchesQuery = (values: unknown[], query: string) => {
  const comparableQuery = normalizeComparable(query)
  return values.some((value) =>
    normalizeComparable(normalizeString(value)).includes(comparableQuery)
  )
}

const categoryMatchesQuery = (
  category: RawSearchAutocompleteCategoryRef,
  query: string
) => matchesQuery([category.name, category.handle], query)

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
  productHits,
  query,
  limit,
}: {
  productHits: RawSearchAutocompleteProductHit[]
  query: string
  limit: number
}) => {
  const suggestions: SearchAutocompleteSuggestion[] = []
  const seen = new Set<string>()

  const pushSuggestion = (suggestion: SearchAutocompleteSuggestion | null) => {
    if (!suggestion || seen.has(suggestion.href)) {
      return
    }

    seen.add(suggestion.href)
    suggestions.push(suggestion)
  }

  for (const product of productHits) {
    for (const category of product.categories ?? []) {
      if (categoryMatchesQuery(category, query)) {
        pushSuggestion(createCategorySuggestion(category))
      }
    }
  }

  return suggestions.slice(0, limit)
}

const brandMatchesQuery = (
  brand: RawSearchAutocompleteBrandRef,
  query: string
) => matchesQuery([brand.title, brand.handle], query)

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

const createBrandSuggestionFromFacet = (
  facet: RawSearchAutocompleteFacetItem
): SearchAutocompleteSuggestion | null => {
  const id = normalizeString(facet.id)
  const title = normalizeString(facet.label)
  const slug = id.startsWith("brand-")
    ? id.slice("brand-".length)
    : resolveBrandSlug(id, title)

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

const pushUniqueSuggestion = (
  suggestions: SearchAutocompleteSuggestion[],
  seen: Set<string>,
  suggestion: SearchAutocompleteSuggestion | null
) => {
  if (!suggestion || seen.has(suggestion.href)) {
    return
  }

  seen.add(suggestion.href)
  suggestions.push(suggestion)
}

export const createBrandSuggestions = ({
  brandFacets,
  productHits,
  query,
  limit,
}: {
  brandFacets: RawSearchAutocompleteFacetItem[]
  productHits: RawSearchAutocompleteProductHit[]
  query: string
  limit: number
}) => {
  const suggestions: SearchAutocompleteSuggestion[] = []
  const seen = new Set<string>()

  for (const facet of brandFacets) {
    if (!matchesQuery([facet.id, facet.label], query)) {
      continue
    }

    pushUniqueSuggestion(
      suggestions,
      seen,
      createBrandSuggestionFromFacet(facet)
    )
  }

  for (const product of productHits) {
    const brand = product.brand
    if (!(brand && brandMatchesQuery(brand, query))) {
      continue
    }

    pushUniqueSuggestion(suggestions, seen, createBrandSuggestion(brand))
  }

  return suggestions.slice(0, limit)
}
