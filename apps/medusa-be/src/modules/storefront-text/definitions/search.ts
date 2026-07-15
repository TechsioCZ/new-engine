import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_SEARCH_TEXT_DEFINITIONS = [
  {
    description: "Zástupný text vyhledávacího pole.",
    key: "search.input_placeholder",
    namespace: "search",
    values: {
      cz: "Napište, co hledáte...",
      hu: "Írja be, mit keres...",
      ro: "Scrieți ce căutați...",
      sk: "Napíšte, čo hľadáte...",
    },
  },
  {
    description: "Přístupný popisek tlačítka pro spuštění vyhledávání.",
    key: "search.submit_aria",
    namespace: "search",
    values: {
      cz: "Hledat",
      hu: "Keresés",
      ro: "Căutare",
      sk: "Hľadať",
    },
  },
  {
    description: "Přístupný popisek vyhledávacího pole.",
    key: "search.input_aria",
    namespace: "search",
    values: {
      cz: "Vyhledávání",
      hu: "Keresés",
      ro: "Căutare",
      sk: "Vyhľadávanie",
    },
  },
  {
    description: "Přístupný popisek tlačítka pro vymazání vyhledávání.",
    key: "search.clear_aria",
    namespace: "search",
    values: {
      cz: "Vymazat vyhledávání",
      hu: "Keresés törlése",
      ro: "Ștergeți căutarea",
      sk: "Vymazať vyhľadávanie",
    },
  },
  {
    description: "Stavová hláška při načítání návrhů vyhledávání.",
    key: "search.autocomplete.loading",
    namespace: "search",
    values: {
      cz: "Hledáme návrhy...",
      hu: "Javaslatok keresése...",
      ro: "Căutăm sugestii...",
      sk: "Hľadáme návrhy...",
    },
  },
  {
    description: "Chybová hláška při načítání návrhů vyhledávání.",
    key: "search.autocomplete.load_failed",
    namespace: "search",
    values: {
      cz: "Návrhy se nepodařilo načíst.",
      hu: "A javaslatokat nem sikerült betölteni.",
      ro: "Sugestiile nu au putut fi încărcate.",
      sk: "Návrhy sa nepodarilo načítať.",
    },
  },
  {
    description: "Hláška pro vyhledávání bez rychlých návrhů.",
    key: "search.autocomplete.empty",
    namespace: "search",
    values: {
      cz: "Pro výraz „{query}“ nemáme rychlé návrhy.",
      hu: "Nincsenek gyors javaslataink a(z) „{query}” kifejezésre.",
      ro: "Nu avem sugestii rapide pentru „{query}”.",
      sk: "Pre výraz „{query}“ nemáme rýchle návrhy.",
    },
  },
  {
    description: "Nadpis produktové sekce v návrzích vyhledávání.",
    key: "search.autocomplete.sections.products",
    namespace: "search",
    values: {
      cz: "Produkty",
      hu: "Termékek",
      ro: "Produse",
      sk: "Produkty",
    },
  },
  {
    description: "Nadpis sekce kategorií v návrzích vyhledávání.",
    key: "search.autocomplete.sections.categories",
    namespace: "search",
    values: {
      cz: "Kategorie",
      hu: "Kategóriák",
      ro: "Categorii",
      sk: "Kategórie",
    },
  },
  {
    description: "Nadpis sekce značek v návrzích vyhledávání.",
    key: "search.autocomplete.sections.brands",
    namespace: "search",
    values: {
      cz: "Značky",
      hu: "Márkák",
      ro: "Mărci",
      sk: "Značky",
    },
  },
  {
    description: "Typ návrhu pro kategorii.",
    key: "search.autocomplete.types.category",
    namespace: "search",
    values: {
      cz: "Kategorie",
      hu: "Kategória",
      ro: "Categorie",
      sk: "Kategória",
    },
  },
  {
    description: "Typ návrhu pro značku.",
    key: "search.autocomplete.types.brand",
    namespace: "search",
    values: {
      cz: "Značka",
      hu: "Márka",
      ro: "Marcă",
      sk: "Značka",
    },
  },
  {
    description: "Označení produktu dostupného skladem v návrzích vyhledávání.",
    key: "search.availability.in_stock",
    namespace: "search",
    values: {
      cz: "Skladem",
      hu: "Raktáron",
      ro: "În stoc",
      sk: "Skladom",
    },
  },
  {
    description: "Označení vyprodaného produktu v návrzích vyhledávání.",
    key: "search.availability.out_of_stock",
    namespace: "search",
    values: {
      cz: "Vyprodáno",
      hu: "Elfogyott",
      ro: "Stoc epuizat",
      sk: "Vypredané",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]
