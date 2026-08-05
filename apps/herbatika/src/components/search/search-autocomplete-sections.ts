import type { SearchAutocompleteResponse } from "@/lib/search-autocomplete/search-autocomplete-types"

import type { SearchAutocompletePanelSection } from "./search-autocomplete-panel"

interface SearchAutocompleteSectionTitles {
  brands: string
  categories: string
  products: string
}

export const createSearchAutocompleteSections = (
  data: SearchAutocompleteResponse,
  titles: SearchAutocompleteSectionTitles
): SearchAutocompletePanelSection[] => [
  { items: data.products, key: "product", title: titles.products },
  { items: data.categories, key: "category", title: titles.categories },
  { items: data.brands, key: "brand", title: titles.brands },
]

export const clampSearchAutocompleteIndex = (
  index: number,
  itemCount: number
) => {
  if (itemCount === 0) {
    return -1
  }

  if (index < 0) {
    return itemCount - 1
  }

  if (index >= itemCount) {
    return 0
  }

  return index
}
