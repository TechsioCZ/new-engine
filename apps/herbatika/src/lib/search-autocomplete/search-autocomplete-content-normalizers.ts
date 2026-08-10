import { normalizeString } from "./search-autocomplete-normalizers"
import type {
  RawSearchAutocompleteContentHit,
  SearchAutocompleteSuggestion,
} from "./search-autocomplete-types"

const createContentSuggestion = (
  hit: RawSearchAutocompleteContentHit,
): SearchAutocompleteSuggestion | null => {
  const id = normalizeString(hit.id)
  const title = normalizeString(hit.title)
  const href = normalizeString(hit.href)

  if (id === "" || title === "" || href === "") {
    return null
  }

  const subtitle = normalizeString(hit.excerpt)

  return {
    href,
    id,
    ...(subtitle === "" ? {} : { subtitle }),
    title,
    type: "content",
  }
}

export const createContentSuggestions = (
  hits: RawSearchAutocompleteContentHit[],
) =>
  hits
    .map(createContentSuggestion)
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item))
