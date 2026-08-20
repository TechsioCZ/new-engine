import type {
  SearchAutocompleteResponse,
  SearchAutocompleteSuggestion,
  SearchAutocompleteSuggestionType,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import { parsePublicPath } from "@/lib/url/public-route-api"
import type { Market } from "@/lib/url/types"
import type { EntityUrlKind } from "@/lib/url-registry/model"

const LEGACY_PUBLIC_PATH_PATTERN = /^\/(?:c|p|search|znacka)(?:\/|$|\?)/i

export const isCanonicalPublicSuggestion = (
  suggestion: SearchAutocompleteSuggestion
) => {
  const href = suggestion.href.trim()
  return (
    href.startsWith("/") &&
    !href.startsWith("//") &&
    !href.startsWith("/~sf") &&
    !LEGACY_PUBLIC_PATH_PATTERN.test(href)
  )
}

export const keepCanonicalPublicSuggestions = (
  response: SearchAutocompleteResponse
): SearchAutocompleteResponse => ({
  ...response,
  brands: response.brands.filter(isCanonicalPublicSuggestion),
  categories: response.categories.filter(isCanonicalPublicSuggestion),
  content: response.content.filter(isCanonicalPublicSuggestion),
  products: response.products.filter(isCanonicalPublicSuggestion),
})

export type SearchPublicSlugMaps = Readonly<{
  articlePublicSlugsById?: Readonly<Record<string, string>>
  brandPublicSlugsById?: Readonly<Record<string, string>>
  categoryPublicSlugsById?: Readonly<Record<string, string>>
  productPublicSlugsById?: Readonly<Record<string, string>>
}>

export type ProjectableSearchSuggestion = SearchAutocompleteSuggestion &
  Readonly<{ sourceId?: string }>

const ENTITY_KIND_BY_SUGGESTION_TYPE = {
  brand: "brand",
  category: "category",
  content: "article",
  product: "product",
} as const satisfies Record<SearchAutocompleteSuggestionType, EntityUrlKind>

const publicSlugForSuggestion = (
  suggestion: ProjectableSearchSuggestion,
  maps: SearchPublicSlugMaps
) => {
  const sourceId = suggestion.sourceId ?? suggestion.id

  switch (suggestion.type) {
    case "product":
      return maps.productPublicSlugsById?.[sourceId]
    case "category":
      return maps.categoryPublicSlugsById?.[sourceId]
    case "brand":
      return maps.brandPublicSlugsById?.[sourceId]
    case "content":
      return maps.articlePublicSlugsById?.[sourceId]
    default:
      return
  }
}

const validatedServerProjectedHref = (
  suggestion: SearchAutocompleteSuggestion,
  market: Market
): string | null => {
  if (!isCanonicalPublicSuggestion(suggestion)) {
    return null
  }

  const href = suggestion.href.trim()
  if (href.includes("#")) {
    return null
  }

  const queryStart = href.indexOf("?")
  const parsed = parsePublicPath({
    market,
    pathname: queryStart === -1 ? href : href.slice(0, queryStart),
    rawQuery: queryStart === -1 ? undefined : href.slice(queryStart + 1),
  })
  const entityKind = ENTITY_KIND_BY_SUGGESTION_TYPE[suggestion.type]
  const hasExpectedEntityKind =
    parsed.kind === "found" &&
    (parsed.target.kind === entityKind ||
      (suggestion.type === "content" && parsed.target.kind === "page"))

  return parsed.kind === "found" &&
    !parsed.canonicalization.required &&
    hasExpectedEntityKind &&
    "slug" in parsed.target
    ? href
    : null
}

const projectSuggestion = (
  suggestion: SearchAutocompleteSuggestion,
  maps: SearchPublicSlugMaps,
  market: Market
): SearchAutocompleteSuggestion | null => {
  const projectedHref = buildProjectedEntityPath(
    ENTITY_KIND_BY_SUGGESTION_TYPE[suggestion.type],
    { publicSlug: publicSlugForSuggestion(suggestion, maps) },
    market
  )
  const href = projectedHref ?? validatedServerProjectedHref(suggestion, market)
  return href ? { ...suggestion, href } : null
}

const projectSuggestionList = (
  suggestions: SearchAutocompleteSuggestion[],
  maps: SearchPublicSlugMaps,
  market: Market
) =>
  suggestions.flatMap((suggestion) => {
    const projected = projectSuggestion(suggestion, maps, market)
    return projected ? [projected] : []
  })

export const projectSearchAutocompleteResponse = (
  response: SearchAutocompleteResponse,
  maps: SearchPublicSlugMaps,
  market: Market
): SearchAutocompleteResponse =>
  keepCanonicalPublicSuggestions({
    ...response,
    brands: projectSuggestionList(response.brands, maps, market),
    categories: projectSuggestionList(response.categories, maps, market),
    content: projectSuggestionList(response.content, maps, market),
    products: projectSuggestionList(response.products, maps, market),
  })
