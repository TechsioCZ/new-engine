import { normalizeString } from './search-autocomplete-normalizers'
import type { RawSearchAutocompleteContentHit, SearchAutocompleteSuggestion } from './search-autocomplete-types'

const createContentSuggestion = (hit: RawSearchAutocompleteContentHit): SearchAutocompleteSuggestion | null => {
	const id = normalizeString(hit.id)
	const title = normalizeString(hit.title)
	const href = normalizeString(hit.href)
	const type = normalizeString(hit.type)

	if (!id || !title || !href) {
		return null
	}

	return {
		id: id,
		type: 'content',
		title: title,
		href: href,
		subtitle: type === 'article' ? 'Článok' : normalizeString(hit.excerpt) || 'Informačná stránka'
	}
}

export const createContentSuggestions = (hits: RawSearchAutocompleteContentHit[]) => hits.map(createContentSuggestion).filter((item): item is SearchAutocompleteSuggestion => Boolean(item))
