import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_SEARCH_RESULTS_TEXT_DEFINITIONS = [
  {
    description: "Nadpis stránky s výsledky vyhledávání.",
    key: "search.results.title",
    namespace: "search",
    values: {
      cz: "Vyhledávání",
      hu: "Keresés",
      ro: "Căutare",
      sk: "Vyhľadávanie",
    },
  },
  {
    description: "Popis stránky s výsledky vyhledávání.",
    key: "search.results.description",
    namespace: "search",
    values: {
      cz: "Vyhledejte produkty v katalogu.",
      hu: "Keressen termékeket a katalógusban.",
      ro: "Căutați produse în catalog.",
      sk: "Vyhľadajte produkty v katalógu.",
    },
  },
  {
    description: "Štítek s hledaným výrazem.",
    key: "search.results.query",
    namespace: "search",
    values: {
      cz: "dotaz: {query}",
      hu: "keresés: {query}",
      ro: "căutare: {query}",
      sk: "dotaz: {query}",
    },
  },
  {
    description: "Štítek s počtem nalezených produktů.",
    key: "search.results.found",
    namespace: "search",
    values: {
      cz: "nalezeno: {count}",
      hu: "találatok: {count}",
      ro: "găsite: {count}",
      sk: "nájdené: {count}",
    },
  },
  {
    description: "Štítek s aktuální stránkou výsledků vyhledávání.",
    key: "search.results.page",
    namespace: "search",
    values: {
      cz: "strana: {page}/{totalPages}",
      hu: "oldal: {page}/{totalPages}",
      ro: "pagina: {page}/{totalPages}",
      sk: "strana: {page}/{totalPages}",
    },
  },
  {
    description: "Prázdný stav výsledků vyhledávání.",
    key: "search.results.empty",
    namespace: "search",
    values: {
      cz: "Pro výraz „{query}“ nebyly nalezeny žádné produkty.",
      hu: "A(z) „{query}” kifejezésre nem találhatók termékek.",
      ro: "Nu au fost găsite produse pentru „{query}”.",
      sk: "Pre výraz „{query}“ sa nenašli žiadne produkty.",
    },
  },
  {
    description: "Výzva k zadání hledaného výrazu.",
    key: "search.results.enter_query",
    namespace: "search",
    values: {
      cz: "Zadejte výraz do vyhledávání v horním panelu.",
      hu: "Írjon be egy keresési kifejezést a felső sávba.",
      ro: "Introduceți un termen de căutare în bara de sus.",
      sk: "Zadajte výraz do vyhľadávania v hornom paneli.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]
