import type { StorefrontTextDefinition } from "../registry"

const defineCatalogProductText = <const Key extends string>(
  key: Key,
  description: string,
  values: StorefrontTextDefinition["values"]
) =>
  ({
    description,
    key,
    namespace: "catalog",
    values,
  }) satisfies StorefrontTextDefinition

export const STOREFRONT_CATALOG_PRODUCT_TEXT_DEFINITIONS = [
  defineCatalogProductText(
    "catalog.product_card.price_on_request",
    "Zástupný text ceny produktu, když katalog neposkytne cenu.",
    {
      cz: "Cena na vyžádání",
      hu: "Ár kérésre",
      ro: "Preț la cerere",
      sk: "Cena na vyžiadanie",
    }
  ),
  defineCatalogProductText(
    "catalog.product_card.collection_empty",
    "Prázdný stav kolekce bez dostupných produktů.",
    {
      cz: "V této sekci momentálně nejsou žádné produkty.",
      hu: "Ebben a szakaszban jelenleg nincsenek termékek.",
      ro: "Momentan nu există produse în această secțiune.",
      sk: "V tejto sekcii momentálne nie sú žiadne produkty.",
    }
  ),
  defineCatalogProductText(
    "catalog.product_card.recently_visited_title",
    "Nadpis sekce naposledy navštívených produktů.",
    {
      cz: "Naposledy navštívené",
      hu: "Legutóbb megtekintett",
      ro: "Vizitate recent",
      sk: "Naposledy navštívené",
    }
  ),
  defineCatalogProductText(
    "catalog.product_card.recently_visited_empty",
    "Prázdný stav sekce naposledy navštívených produktů.",
    {
      cz: "Zatím nemáte žádné naposledy navštívené produkty.",
      hu: "Még nincsenek legutóbb megtekintett termékeid.",
      ro: "Nu ai încă produse vizitate recent.",
      sk: "Zatiaľ nemáte žiadne naposledy navštívené produkty.",
    }
  ),
] as const satisfies readonly StorefrontTextDefinition[]
