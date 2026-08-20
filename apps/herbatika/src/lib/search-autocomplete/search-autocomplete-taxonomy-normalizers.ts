import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projections"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import type { Market } from "@/lib/url/types"
import {
  createHandleLabel,
  normalizeString,
} from "./search-autocomplete-normalizers"
import type {
  RawSearchAutocompleteBrandRef,
  RawSearchAutocompleteCategoryRef,
  SearchAutocompleteSuggestion,
} from "./search-autocomplete-types"

const createCategorySuggestion = (
  category: RawSearchAutocompleteCategoryRef,
  market: Market,
  publicSlugsByCategoryId: PublicEntitySlugMap
): SearchAutocompleteSuggestion | null => {
  const id = normalizeString(category.id)
  const handle = normalizeString(category.handle)
  const title = normalizeString(category.name) || createHandleLabel(handle)
  const href = buildProjectedEntityPath(
    "category",
    { publicSlug: id ? publicSlugsByCategoryId[id] : undefined },
    market
  )

  if (!(id && title && href)) {
    return null
  }

  return {
    id,
    sourceId: id,
    type: "category",
    title,
    href,
  }
}

export const createCategorySuggestions = ({
  categoryHits,
  market,
  publicSlugsByCategoryId,
}: {
  categoryHits: RawSearchAutocompleteCategoryRef[]
  market: Market
  publicSlugsByCategoryId: PublicEntitySlugMap
}) =>
  categoryHits
    .map((category) =>
      createCategorySuggestion(category, market, publicSlugsByCategoryId)
    )
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item))

const createBrandSuggestion = (
  brand: RawSearchAutocompleteBrandRef,
  market: Market,
  publicSlugsByBrandId: PublicEntitySlugMap
): SearchAutocompleteSuggestion | null => {
  const title = normalizeString(brand.title)
  const id = normalizeString(brand.id)
  const href = buildProjectedEntityPath(
    "brand",
    { publicSlug: id ? publicSlugsByBrandId[id] : undefined },
    market
  )

  if (!(id && title && href)) {
    return null
  }

  return {
    id,
    sourceId: id,
    type: "brand",
    title,
    href,
  }
}

export const createBrandSuggestions = ({
  brandHits,
  market,
  publicSlugsByBrandId,
}: {
  brandHits: RawSearchAutocompleteBrandRef[]
  market: Market
  publicSlugsByBrandId: PublicEntitySlugMap
}) =>
  brandHits
    .map((brand) => createBrandSuggestion(brand, market, publicSlugsByBrandId))
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item))
