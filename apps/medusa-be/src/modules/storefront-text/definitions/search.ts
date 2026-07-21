import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_SEARCH_TEXT_DEFINITIONS = [
  {
    description: "Zástupný text vyhledávacího pole.",
    key: "search.input_placeholder",
    namespace: "search",
  },
  {
    description: "Přístupný popisek tlačítka pro spuštění vyhledávání.",
    key: "search.submit_aria",
    namespace: "search",
  },
  {
    description: "Přístupný popisek vyhledávacího pole.",
    key: "search.input_aria",
    namespace: "search",
  },
  {
    description: "Přístupný popisek tlačítka pro vymazání vyhledávání.",
    key: "search.clear_aria",
    namespace: "search",
  },
  {
    description: "Stavová hláška při načítání návrhů vyhledávání.",
    key: "search.autocomplete.loading",
    namespace: "search",
  },
  {
    description: "Chybová hláška při načítání návrhů vyhledávání.",
    key: "search.autocomplete.load_failed",
    namespace: "search",
  },
  {
    description: "Hláška pro vyhledávání bez rychlých návrhů.",
    key: "search.autocomplete.empty",
    namespace: "search",
  },
  {
    description: "Nadpis produktové sekce v návrzích vyhledávání.",
    key: "search.autocomplete.sections.products",
    namespace: "search",
  },
  {
    description: "Nadpis sekce kategorií v návrzích vyhledávání.",
    key: "search.autocomplete.sections.categories",
    namespace: "search",
  },
  {
    description: "Nadpis sekce značek v návrzích vyhledávání.",
    key: "search.autocomplete.sections.brands",
    namespace: "search",
  },
  {
    description: "Typ návrhu pro kategorii.",
    key: "search.autocomplete.types.category",
    namespace: "search",
  },
  {
    description: "Typ návrhu pro značku.",
    key: "search.autocomplete.types.brand",
    namespace: "search",
  },
  {
    description: "Označení produktu dostupného skladem v návrzích vyhledávání.",
    key: "search.availability.in_stock",
    namespace: "search",
  },
  {
    description: "Označení vyprodaného produktu v návrzích vyhledávání.",
    key: "search.availability.out_of_stock",
    namespace: "search",
  },
] as const satisfies readonly StorefrontTextDefinition[]
