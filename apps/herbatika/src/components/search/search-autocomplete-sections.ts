import type { ComboboxItem } from "@techsio/ui-kit/molecules/combobox"

import type {
  SearchAutocompleteResponse,
  SearchAutocompleteSuggestion,
  SearchAutocompleteSuggestionType,
} from "@/lib/search-autocomplete/search-autocomplete-types"

export interface SearchAutocompletePanelSection {
  key: SearchAutocompleteSuggestionType
  title: string
  items: SearchAutocompleteSuggestion[]
}

interface SearchAutocompleteSectionTitles {
  brands: string
  categories: string
  content: string
  products: string
}

export const createSearchAutocompleteSections = (
  data: SearchAutocompleteResponse,
  titles: SearchAutocompleteSectionTitles,
): SearchAutocompletePanelSection[] => [
  { items: data.products, key: "product", title: titles.products },
  { items: data.categories, key: "category", title: titles.categories },
  { items: data.brands, key: "brand", title: titles.brands },
  { items: data.content, key: "content", title: titles.content },
]

export const toSearchComboboxItem = (
  item: SearchAutocompleteSuggestion,
): ComboboxItem<SearchAutocompleteSuggestion> => ({
  data: item,
  label: item.title,
  value: `${item.type}:${item.id}`,
})
