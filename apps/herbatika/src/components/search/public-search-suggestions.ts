import type {
  SearchAutocompleteResponse,
  SearchAutocompleteSuggestion,
  SearchAutocompleteSuggestionType,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
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

const projectSuggestion = (
  suggestion: SearchAutocompleteSuggestion,
  maps: SearchPublicSlugMaps,
  market: Market
): SearchAutocompleteSuggestion | null => {
  const href = buildProjectedEntityPath(
    ENTITY_KIND_BY_SUGGESTION_TYPE[suggestion.type],
    { publicSlug: publicSlugForSuggestion(suggestion, maps) },
    market
  )
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
