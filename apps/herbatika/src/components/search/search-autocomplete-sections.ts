import type { SearchAutocompleteResponse } from "@/lib/search-autocomplete/search-autocomplete-types"
import type { SearchAutocompletePanelSection } from "./search-autocomplete-panel"

type SearchAutocompleteSectionTitles = {
  brands: string
  categories: string
  products: string
}

export const createSearchAutocompleteSections = (
  data: SearchAutocompleteResponse,
  titles: SearchAutocompleteSectionTitles
): SearchAutocompletePanelSection[] => [
  { key: "product", title: titles.products, items: data.products },
  { key: "category", title: titles.categories, items: data.categories },
  { key: "brand", title: titles.brands, items: data.brands },
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
