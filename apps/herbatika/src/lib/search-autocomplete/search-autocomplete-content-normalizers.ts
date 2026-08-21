import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projections"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import type { Market } from "@/lib/url/types"
import { normalizeString } from "./search-autocomplete-normalizers"
import type {
  RawSearchAutocompleteContentHit,
  SearchAutocompleteSuggestion,
} from "./search-autocomplete-types"

const createContentSuggestion = (
  hit: RawSearchAutocompleteContentHit,
  market: Market,
  publicSlugsByArticleId: PublicEntitySlugMap,
  publicSlugsByPageId: PublicEntitySlugMap
): SearchAutocompleteSuggestion | null => {
  const id = normalizeString(hit.id)
  const title = normalizeString(hit.title)
  const type = normalizeString(hit.type)
  let entityKind: "article" | "page" | null = null
  if (type === "article" || type === "page") {
    entityKind = type
  }
  // Content search documents use "<type>_<sourceId>" ids; the slug maps are
  // keyed by the bare source id.
  const sourceId =
    entityKind && id.startsWith(`${entityKind}_`)
      ? id.slice(entityKind.length + 1)
      : id
  const publicSlug = entityKind
    ? (entityKind === "article" ? publicSlugsByArticleId : publicSlugsByPageId)[
        sourceId
      ]
    : undefined
  const href = entityKind
    ? buildProjectedEntityPath(entityKind, { publicSlug }, market)
    : null

  if (!(id && title && href)) {
    return null
  }

  return {
    id,
    sourceId: id,
    type: "content",
    title,
    href,
    subtitle:
      type === "article"
        ? "Článok"
        : normalizeString(hit.excerpt) || "Informačná stránka",
  }
}

export const createContentSuggestions = (
  hits: RawSearchAutocompleteContentHit[],
  market: Market,
  publicSlugsByArticleId: PublicEntitySlugMap,
  publicSlugsByPageId: PublicEntitySlugMap
) =>
  hits
    .map((hit) =>
      createContentSuggestion(
        hit,
        market,
        publicSlugsByArticleId,
        publicSlugsByPageId
      )
    )
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item))
