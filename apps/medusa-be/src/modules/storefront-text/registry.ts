export const STOREFRONT_TEXT_STATUSES = ["active", "draft"] as const

export type StorefrontTextStatus = (typeof STOREFRONT_TEXT_STATUSES)[number]

export const STOREFRONT_TEXT_NAMESPACES = ["cart"] as const

export type StorefrontTextNamespace =
  (typeof STOREFRONT_TEXT_NAMESPACES)[number]

export const STOREFRONT_TEXT_MARKETS = [
  {
    country: "sk",
    domain: "herbatica.sk",
    label: "Slovensko",
    locale: "sk-SK",
    market: "sk",
  },
  {
    country: "cz",
    domain: "herbatica.cz",
    label: "Česko",
    locale: "cs-CZ",
    market: "cz",
  },
  {
    country: "hu",
    domain: "herbatica.hu",
    label: "Maďarsko",
    locale: "hu-HU",
    market: "hu",
  },
  {
    country: "ro",
    domain: "herbatica.ro",
    label: "Rumunsko",
    locale: "ro-RO",
    market: "ro",
  },
] as const

export type StorefrontTextMarket =
  (typeof STOREFRONT_TEXT_MARKETS)[number]["market"]

export type StorefrontTextLocale =
  (typeof STOREFRONT_TEXT_MARKETS)[number]["locale"]

export const STOREFRONT_TEXT_MARKET_IDS = ["sk", "cz", "hu", "ro"] as const

export const STOREFRONT_TEXT_LOCALES = [
  "sk-SK",
  "cs-CZ",
  "hu-HU",
  "ro-RO",
] as const

type EqualTypes<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type ExpectTrue<Value extends true> = Value

export type StorefrontTextRegistryAssertions = [
  ExpectTrue<
    EqualTypes<
      StorefrontTextMarket,
      (typeof STOREFRONT_TEXT_MARKET_IDS)[number]
    >
  >,
  ExpectTrue<
    EqualTypes<StorefrontTextLocale, (typeof STOREFRONT_TEXT_LOCALES)[number]>
  >,
]

export type StorefrontTextDefinition = {
  description: string
  key: string
  namespace: StorefrontTextNamespace
  values: Record<StorefrontTextMarket, string>
}

export const STOREFRONT_TEXT_DEFINITIONS = [
  {
    description: "Label tlačítka pro přidání produktu do košíku.",
    key: "cart.add_to_cart",
    namespace: "cart",
    values: {
      cz: "Do košíku",
      hu: "Kosárba",
      ro: "Adaugă în coș",
      sk: "Do košíka",
    },
  },
  {
    description: "Text tlačítka během přidávání produktu do košíku.",
    key: "cart.adding_to_cart",
    namespace: "cart",
    values: {
      cz: "Přidávám...",
      hu: "Hozzáadás...",
      ro: "Se adaugă...",
      sk: "Pridávam...",
    },
  },
  {
    description: "Toast po úspěšném přidání produktu do košíku.",
    key: "cart.added_to_cart",
    namespace: "cart",
    values: {
      cz: "Produkt byl přidán do košíku.",
      hu: "A termék a kosárba került.",
      ro: "Produsul a fost adăugat în coș.",
      sk: "Produkt bol pridaný do košíka.",
    },
  },
  {
    description: "Chybová hláška při neúspěšném přidání do košíku.",
    key: "cart.failed",
    namespace: "cart",
    values: {
      cz: "Přidání do košíku selhalo.",
      hu: "A kosárba helyezés nem sikerült.",
      ro: "Adăugarea în coș a eșuat.",
      sk: "Pridanie do košíka zlyhalo.",
    },
  },
  {
    description: "Chybová hláška pro nedostatečné skladové množství.",
    key: "cart.insufficient_quantity",
    namespace: "cart",
    values: {
      cz: "Nedostatečné množství produktu.",
      hu: "Nincs elegendő mennyiség a termékből.",
      ro: "Cantitate insuficientă pentru produs.",
      sk: "Nedostatočné množstvo produktu.",
    },
  },
  {
    description:
      "Chybová hláška pro nedostatečné množství s dostupným množstvím.",
    key: "cart.insufficient_quantity_available",
    namespace: "cart",
    values: {
      cz: "Nedostatečné množství produktu. Dostupné množství: {availableQuantity} ks.",
      hu: "Nincs elegendő mennyiség a termékből. Elérhető mennyiség: {availableQuantity} db.",
      ro: "Cantitate insuficientă pentru produs. Cantitate disponibilă: {availableQuantity} buc.",
      sk: "Nedostatočné množstvo produktu. Dostupné množstvo: {availableQuantity} ks.",
    },
  },
  {
    description:
      "Chybová hláška pro nedostatečné množství s množstvím v košíku.",
    key: "cart.insufficient_quantity_in_cart",
    namespace: "cart",
    values: {
      cz: "Nedostatečné množství produktu. V košíku už máte {cartQuantity} ks, dostupné množství je {availableQuantity} ks.",
      hu: "Nincs elegendő mennyiség a termékből. A kosárban már {cartQuantity} db van, elérhető mennyiség: {availableQuantity} db.",
      ro: "Cantitate insuficientă pentru produs. Ai deja {cartQuantity} buc. în coș, cantitatea disponibilă este {availableQuantity} buc.",
      sk: "Nedostatočné množstvo produktu. V košíku už máte {cartQuantity} ks, dostupné množstvo je {availableQuantity} ks.",
    },
  },
  {
    description: "Chybová hláška při načítání regionu košíku.",
    key: "cart.missing_region",
    namespace: "cart",
    values: {
      cz: "Region se ještě načítá. Zkuste to prosím za chvíli.",
      hu: "A régió még betöltődik. Kérjük, próbáld újra később.",
      ro: "Regiunea încă se încarcă. Te rugăm să încerci din nou în câteva momente.",
      sk: "Región sa ešte načítava. Skúste to prosím o chvíľu.",
    },
  },
  {
    description: "Chybová hláška pro produkt bez dostupné varianty.",
    key: "cart.missing_variant",
    namespace: "cart",
    values: {
      cz: "Produkt nemá dostupnou variantu pro přidání do košíku.",
      hu: "A terméknek nincs kosárba tehető elérhető változata.",
      ro: "Produsul nu are o variantă disponibilă pentru adăugare în coș.",
      sk: "Produkt nemá dostupnú variantu na pridanie do košíka.",
    },
  },
  {
    description: "Chybová hláška pro produkt bez skladové dostupnosti.",
    key: "cart.out_of_stock",
    namespace: "cart",
    values: {
      cz: "Produkt momentálně není skladem.",
      hu: "A termék jelenleg nincs készleten.",
      ro: "Produsul nu este momentan în stoc.",
      sk: "Produkt momentálne nie je skladom.",
    },
  },
  {
    description: "Chybová hláška pro produkt nedostupný ve vybraném regionu.",
    key: "cart.unavailable_in_region",
    namespace: "cart",
    values: {
      cz: "Produkt momentálně není dostupný pro vybraný region.",
      hu: "A termék jelenleg nem elérhető a kiválasztott régióban.",
      ro: "Produsul nu este momentan disponibil pentru regiunea selectată.",
      sk: "Produkt nie je momentálne dostupný pre vybraný región.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

export type StorefrontTextKey =
  (typeof STOREFRONT_TEXT_DEFINITIONS)[number]["key"]

export type StorefrontTextMessages = Partial<Record<StorefrontTextKey, string>>

export type StorefrontTextSeedRow = {
  country: string
  description: string
  domain: string
  key: StorefrontTextKey
  locale: StorefrontTextLocale
  market: StorefrontTextMarket
  namespace: StorefrontTextNamespace
  status: StorefrontTextStatus
  value: string
}

export const getStorefrontTextSeedRows = (): StorefrontTextSeedRow[] =>
  STOREFRONT_TEXT_DEFINITIONS.flatMap((definition) =>
    STOREFRONT_TEXT_MARKETS.map((market) => ({
      country: market.country,
      description: definition.description,
      domain: market.domain,
      key: definition.key,
      locale: market.locale,
      market: market.market,
      namespace: definition.namespace,
      status: "active",
      value: definition.values[market.market],
    }))
  )

export const getStorefrontTextDefaultMessages = ({
  market,
  namespace,
}: {
  market: StorefrontTextMarket
  namespace?: StorefrontTextNamespace
}): StorefrontTextMessages => {
  const messages: StorefrontTextMessages = {}

  for (const definition of STOREFRONT_TEXT_DEFINITIONS) {
    if (namespace && definition.namespace !== namespace) {
      continue
    }

    messages[definition.key] = definition.values[market]
  }

  return messages
}
