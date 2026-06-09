import type { SearchAutocompleteResponse } from "@/lib/search-autocomplete/search-autocomplete-types";
import type { SearchAutocompletePanelSection } from "./search-autocomplete-panel";

const SECTION_TITLES = {
  products: "Produkty",
  categories: "Kategórie",
  brands: "Značky",
} as const;

export const createSearchAutocompleteSections = (
  data: SearchAutocompleteResponse,
): SearchAutocompletePanelSection[] => [
  { key: "product", title: SECTION_TITLES.products, items: data.products },
  { key: "category", title: SECTION_TITLES.categories, items: data.categories },
  { key: "brand", title: SECTION_TITLES.brands, items: data.brands },
];

export const clampSearchAutocompleteIndex = (
  index: number,
  itemCount: number,
) => {
  if (itemCount === 0) {
    return -1;
  }

  if (index < 0) {
    return itemCount - 1;
  }

  if (index >= itemCount) {
    return 0;
  }

  return index;
};
