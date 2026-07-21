export const STOREFRONT_TEXT_STATUSES = ["active", "draft"] as const

export type StorefrontTextStatus = (typeof STOREFRONT_TEXT_STATUSES)[number]

export const STOREFRONT_TEXT_NAMESPACES = [
  "auth",
  "catalog",
  "cart",
  "checkout",
  "content",
  "form",
  "navigation",
  "search",
] as const

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

export const isStorefrontTextMarket = (
  value: unknown
): value is StorefrontTextMarket =>
  typeof value === "string" &&
  STOREFRONT_TEXT_MARKET_IDS.some((market) => market === value)

export const isStorefrontTextLocale = (
  value: unknown
): value is StorefrontTextLocale =>
  typeof value === "string" &&
  STOREFRONT_TEXT_LOCALES.some((locale) => locale === value)

export const isStorefrontTextNamespace = (
  value: unknown
): value is StorefrontTextNamespace =>
  typeof value === "string" &&
  STOREFRONT_TEXT_NAMESPACES.some((namespace) => namespace === value)

export const isStorefrontTextStatus = (
  value: unknown
): value is StorefrontTextStatus =>
  typeof value === "string" &&
  STOREFRONT_TEXT_STATUSES.some((status) => status === value)

export const getStorefrontTextMarketConfiguration = (
  market: StorefrontTextMarket
) =>
  STOREFRONT_TEXT_MARKETS.find(
    (configuration) => configuration.market === market
  )

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
}

export const isStorefrontTextMarketLocalePair = (
  market: StorefrontTextMarket,
  locale: StorefrontTextLocale
) =>
  STOREFRONT_TEXT_MARKETS.some(
    (candidate) =>
      candidate.market === market && candidate.locale === locale
  )
