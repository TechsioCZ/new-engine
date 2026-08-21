import { resolve } from "node:path"
import type { TaxRateSeedConfig } from "../workflows/seed/steps/create-tax-rates"
import type { SyncPriceListsStepConfig } from "../workflows/seed/steps/sync-price-lists"
import type { SeedDatabaseWorkflowInput } from "../workflows/seed/workflows/seed-database"

export const HERBATICA_PRODUCTS_XML_ENV = "HERBATICA_XML_PATH"
export const HERBATICA_CATEGORIES_XML_ENV = "HERBATICA_CATEGORIES_XML_PATH"
export const HERBATICA_PROMO_REBASE_DAYS_ENV = "HERBATICA_PROMO_REBASE_DAYS"
export const HERBATICA_REVIEWS_XML_ENV = "HERBATICA_REVIEWS_XML_PATH"
export const HERBATICA_SHIPPING_PRICE_AMOUNTS_ENV =
  "HERBATICA_SHIPPING_PRICE_AMOUNTS_JSON"
export const HERBATICA_MARKET_CURRENCY_CODES = [
  "eur",
  "czk",
  "huf",
  "ron",
] as const

export type HerbaticaMarketCurrencyCode =
  (typeof HERBATICA_MARKET_CURRENCY_CODES)[number]
export type HerbaticaShippingPriceAmounts = Record<
  HerbaticaMarketCurrencyCode,
  number
>
// Deliberately has no default: local files must be explicit, and HTTP(S) inputs
// should be pinned/versioned by the caller rather than pointing at a mutable feed.
export const HERBATICA_MANUFACTURERS_CSV_ENV =
  "HERBATICA_MANUFACTURERS_CSV_PATH"

export const HERBATICA_PRODUCTS_XML_PATHS = [
  resolve(__dirname, "seed-files/productsComplete.xml"),
] as const

export const HERBATICA_CATEGORIES_XML_PATHS = [
  resolve(__dirname, "seed-files/categories.xml"),
] as const

export function parseHerbaticaShippingPriceAmounts(
  raw: string | undefined
): HerbaticaShippingPriceAmounts {
  if (!raw?.trim()) {
    throw new Error(`${HERBATICA_SHIPPING_PRICE_AMOUNTS_ENV} is required`)
  }

  const parsed: unknown = JSON.parse(raw)
  const keys =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? Object.keys(parsed)
      : []

  if (
    keys.length !== HERBATICA_MARKET_CURRENCY_CODES.length ||
    HERBATICA_MARKET_CURRENCY_CODES.some((currency) => !keys.includes(currency))
  ) {
    throw new Error(
      `${HERBATICA_SHIPPING_PRICE_AMOUNTS_ENV} must contain exactly: ${HERBATICA_MARKET_CURRENCY_CODES.join(", ")}`
    )
  }

  const amounts = parsed as Record<string, unknown>
  for (const currency of HERBATICA_MARKET_CURRENCY_CODES) {
    const amount = amounts[currency]
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      throw new Error(
        `${HERBATICA_SHIPPING_PRICE_AMOUNTS_ENV}.${currency} must be a finite positive number`
      )
    }
  }

  return amounts as HerbaticaShippingPriceAmounts
}

export const HERBATICA_COUNTRIES = ["sk", "cz", "hu", "ro"] as const

export const HERBATICA_DEFAULT_STOCK_LOCATION = {
  name: "European Warehouse",
  address: {
    city: "Copenhagen",
    country_code: "DK",
    address_1: "",
  },
} satisfies SeedDatabaseWorkflowInput["stockLocations"]["locations"][number]

export const HERBATICA_FALLBACK_SHOPTET_WAREHOUSE = {
  name: "Shoptet Warehouse",
  address: {
    address_1: "Shoptet Warehouse",
    city: "Unknown",
    country_code: "SK",
  },
} as const

export const HERBATICA_DEFAULT_PRICELIST_LABEL = "Default pricelist"
export const HERBATICA_SALE_PRICE_LIST_TITLE_TEMPLATE =
  "Herbatica sale - {sourceTitle} - {windowLabel}"

export const HERBATICA_DEFAULT_SHOPTET_PRICELIST_TITLES = [
  "hlavny cennik",
  "default pricelist",
] as const

export const HERBATICA_PRICE_LIST_SYNC_CONFIG = {
  metadataSource: "herbatica-products-complete-xml",
  logLabel: "Herbatica price lists",
  descriptions: {
    override: "Herbatica Shoptet price list: {title}",
    sale: "Herbatica sale prices for {sourceTitle}",
  },
  sourceTypes: {
    override: "shoptet_pricelist",
    sale: "shoptet_sale",
    customerGroup: "shoptet_pricelist_customer_group",
  },
  metadataKeys: {
    priceListTitle: "shoptet_pricelist_title",
    startsAt: "starts_at",
    endsAt: "ends_at",
  },
} satisfies SyncPriceListsStepConfig

export const HERBATICA_DEFAULT_TAX_RATES = [
  { countryCode: "sk", rate: 23 },
  { countryCode: "cz", rate: 21 },
  { countryCode: "hu", rate: 27 },
  { countryCode: "ro", rate: 21 },
] as const

export const HERBATICA_TAX_RATE_COUNTRIES = HERBATICA_DEFAULT_TAX_RATES.map(
  ({ countryCode }) => countryCode
)

export const HERBATICA_TAX_RATE_CONFIG = {
  metadataSource: "herbatica-seed-tax-rates",
  defaultRates: [...HERBATICA_DEFAULT_TAX_RATES],
  productOverrides: {
    countryCode: "sk",
    metadataPath: ["top_offer", "vat"],
    groupByRate: true,
  },
  defaultRateNameTemplate: "VAT {COUNTRY}",
  defaultRateCodeTemplate: "vat_{country}",
  productRateNameTemplate: "VAT {COUNTRY} Product {rate}%",
  productRateCodeTemplate: "vat_{country}_product_{rate_code}",
} satisfies TaxRateSeedConfig

export const HERBATICA_WORKFLOW_DEFAULTS = {
  fulfillmentProviderId: "manual_manual",
  shippingOptionPriceAmount: 10,
} satisfies NonNullable<SeedDatabaseWorkflowInput["workflowDefaults"]>

export const HERBATICA_CURRENCIES = [
  {
    code: "eur",
    default: true,
  },
  {
    code: "czk",
    default: false,
  },
  {
    code: "huf",
    default: false,
  },
  {
    code: "ron",
    default: false,
  },
] satisfies SeedDatabaseWorkflowInput["currencies"]

export const HERBATICA_STOREFRONT_SALES_CHANNEL_NAMES = [
  "Herbatica Storefront SK",
  "Herbatica Storefront CZ",
  "Herbatica Storefront HU",
  "Herbatica Storefront RO",
] as const

export const HERBATICA_SALES_CHANNELS = [
  {
    name: HERBATICA_STOREFRONT_SALES_CHANNEL_NAMES[0],
    default: true,
    seedHandle: "herbatica-storefront-sk",
    metadata: {
      herbatica_market: {
        country_code: "sk",
        currency_code: "eur",
        market_code: "sk",
        region_name: "Europe",
        seed_handle: "herbatica-storefront-sk",
      },
      storefront_notification_markets: {
        sk: {
          country_code: "sk",
          locale: "sk-SK",
          market_code: "sk",
          store_name: "Herbatica",
          storefront_domain: "herbatica.sk",
        },
      },
    },
  },
  {
    name: HERBATICA_STOREFRONT_SALES_CHANNEL_NAMES[1],
    default: false,
    seedHandle: "herbatica-storefront-cz",
    metadata: {
      herbatica_market: {
        country_code: "cz",
        currency_code: "czk",
        market_code: "cz",
        region_name: "Czechia",
        seed_handle: "herbatica-storefront-cz",
      },
      storefront_notification_markets: {
        cz: {
          country_code: "cz",
          locale: "cs-CZ",
          market_code: "cz",
          store_name: "Herbatica",
          storefront_domain: "herbatica.cz",
        },
      },
    },
  },
  {
    name: HERBATICA_STOREFRONT_SALES_CHANNEL_NAMES[2],
    default: false,
    seedHandle: "herbatica-storefront-hu",
    metadata: {
      herbatica_market: {
        country_code: "hu",
        currency_code: "huf",
        market_code: "hu",
        region_name: "Hungary",
        seed_handle: "herbatica-storefront-hu",
      },
      storefront_notification_markets: {
        hu: {
          country_code: "hu",
          locale: "hu-HU",
          market_code: "hu",
          store_name: "Herbatica",
          storefront_domain: "herbatica.hu",
        },
      },
    },
  },
  {
    name: HERBATICA_STOREFRONT_SALES_CHANNEL_NAMES[3],
    default: false,
    seedHandle: "herbatica-storefront-ro",
    metadata: {
      herbatica_market: {
        country_code: "ro",
        currency_code: "ron",
        market_code: "ro",
        region_name: "Romania",
        seed_handle: "herbatica-storefront-ro",
      },
      storefront_notification_markets: {
        ro: {
          country_code: "ro",
          locale: "ro-RO",
          market_code: "ro",
          store_name: "Herbatica",
          storefront_domain: "herbatica.ro",
        },
      },
    },
  },
] satisfies SeedDatabaseWorkflowInput["salesChannels"]

export const HERBATICA_DEFAULT_REGIONS = [
  {
    name: "Czechia",
    currencyCode: "czk",
    countries: ["cz"],
    paymentProviders: undefined,
    isTaxInclusive: true,
  },
  {
    name: "Europe",
    currencyCode: "eur",
    countries: ["sk"],
    paymentProviders: undefined,
    isTaxInclusive: true,
  },
  {
    name: "Hungary",
    currencyCode: "huf",
    countries: ["hu"],
    paymentProviders: undefined,
    isTaxInclusive: true,
  },
  {
    name: "Romania",
    currencyCode: "ron",
    countries: ["ro"],
    paymentProviders: undefined,
    isTaxInclusive: true,
  },
] satisfies SeedDatabaseWorkflowInput["regions"]

export const HERBATICA_DEFAULT_SHIPPING_PROFILE = {
  name: "Default Shipping Profile",
} satisfies SeedDatabaseWorkflowInput["defaultShippingProfile"]

export const HERBATICA_DEFAULT_FULFILLMENT_SET = {
  name: "European Warehouse delivery",
  type: "shipping",
  serviceZoneName: "Europe",
} as const

export function buildHerbaticaShippingOptions(
  amounts: HerbaticaShippingPriceAmounts
): SeedDatabaseWorkflowInput["shippingOptions"] {
  return [
    {
      name: "Standard Shipping",
      providerId: HERBATICA_WORKFLOW_DEFAULTS.fulfillmentProviderId,
      type: {
        label: "Standard",
        description: "Ship in 2-3 days.",
        code: "standard",
      },
      prices: HERBATICA_MARKET_CURRENCY_CODES.map((currencyCode) => ({
        currencyCode,
        amount: amounts[currencyCode],
      })),
      rules: [
        {
          attribute: "enabled_in_store",
          value: "true",
          operator: "eq",
        },
        {
          attribute: "is_return",
          value: "false",
          operator: "eq",
        },
      ],
    },
    {
      name: "Express Shipping",
      providerId: HERBATICA_WORKFLOW_DEFAULTS.fulfillmentProviderId,
      type: {
        label: "Express",
        description: "Ship in 24 hours.",
        code: "express",
      },
      prices: HERBATICA_MARKET_CURRENCY_CODES.map((currencyCode) => ({
        currencyCode,
        amount: amounts[currencyCode],
      })),
      rules: [
        {
          attribute: "enabled_in_store",
          value: "true",
          operator: "eq",
        },
        {
          attribute: "is_return",
          value: "false",
          operator: "eq",
        },
      ],
    },
  ]
}

export const HERBATICA_PUBLISHABLE_KEYS = [
  {
    salesChannelNames: [HERBATICA_STOREFRONT_SALES_CHANNEL_NAMES[0]],
    title: "Herbatica Storefront SK Publishable Key",
  },
  {
    salesChannelNames: [HERBATICA_STOREFRONT_SALES_CHANNEL_NAMES[1]],
    title: "Herbatica Storefront CZ Publishable Key",
  },
  {
    salesChannelNames: [HERBATICA_STOREFRONT_SALES_CHANNEL_NAMES[2]],
    title: "Herbatica Storefront HU Publishable Key",
  },
  {
    salesChannelNames: [HERBATICA_STOREFRONT_SALES_CHANNEL_NAMES[3]],
    title: "Herbatica Storefront RO Publishable Key",
  },
] satisfies NonNullable<SeedDatabaseWorkflowInput["publishableKeys"]>
