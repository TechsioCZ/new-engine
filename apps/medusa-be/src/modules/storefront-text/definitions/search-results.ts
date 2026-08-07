import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_SEARCH_RESULTS_TEXT_DEFINITIONS = [
  {
    description: "Nadpis stránky s výsledky vyhledávání.",
    key: "search.results.title",
    namespace: "search",
  },
  {
    description: "Popis stránky s výsledky vyhledávání.",
    key: "search.results.description",
    namespace: "search",
  },
  {
    description: "Štítek s hledaným výrazem.",
    key: "search.results.query",
    namespace: "search",
  },
  {
    description: "Štítek s počtem nalezených produktů.",
    key: "search.results.found",
    namespace: "search",
  },
  {
    description: "Štítek s aktuální stránkou výsledků vyhledávání.",
    key: "search.results.page",
    namespace: "search",
  },
  {
    description: "Prázdný stav výsledků vyhledávání.",
    key: "search.results.empty",
    namespace: "search",
  },
  {
    description: "Výzva k zadání hledaného výrazu.",
    key: "search.results.enter_query",
    namespace: "search",
  },
] as const satisfies readonly StorefrontTextDefinition[]
