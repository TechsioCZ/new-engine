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
