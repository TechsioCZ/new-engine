import { resolve } from "node:path"
import type { TaxRateSeedConfig } from "../workflows/seed/steps/create-tax-rates"
import type { SyncPriceListsStepConfig } from "../workflows/seed/steps/sync-price-lists"
import type { SeedDatabaseWorkflowInput } from "../workflows/seed/workflows/seed-database"

export const HERBATICA_PRODUCTS_XML_ENV = "HERBATICA_XML_PATH"
export const HERBATICA_CATEGORIES_XML_ENV = "HERBATICA_CATEGORIES_XML_PATH"
export const HERBATICA_PROMO_REBASE_DAYS_ENV = "HERBATICA_PROMO_REBASE_DAYS"

export const HERBATICA_PRODUCTS_XML_PATHS = [
  resolve(__dirname, "seed-files/productsComplete.xml"),
] as const

export const HERBATICA_CATEGORIES_XML_PATHS = [
  resolve(__dirname, "seed-files/categories.xml"),
] as const

export const HERBATICA_COUNTRIES = [
  "cz",
  "gb",
  "de",
  "dk",
  "se",
  "fr",
  "es",
  "it",
  "pl",
  "at",
  "sk",
] as const

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
  { countryCode: "cz", rate: 19 },
] as const

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
    code: "czk",
    default: true,
  },
  {
    code: "eur",
    default: false,
  },
  {
    code: "usd",
    default: false,
  },
] satisfies SeedDatabaseWorkflowInput["currencies"]

export const HERBATICA_SALES_CHANNELS = [
  {
    name: "Default Sales Channel",
    default: true,
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
    countries: HERBATICA_COUNTRIES.filter((country) => country !== "cz"),
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

export const HERBATICA_SHIPPING_OPTIONS = [
  {
    name: "Standard Shipping",
    providerId: HERBATICA_WORKFLOW_DEFAULTS.fulfillmentProviderId,
    type: {
      label: "Standard",
      description: "Ship in 2-3 days.",
      code: "standard",
    },
    prices: [
      {
        currencyCode: "usd",
        amount: 10,
      },
      {
        currencyCode: "eur",
        amount: 10,
      },
      {
        currencyCode: "czk",
        amount: 250,
      },
    ],
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
    prices: [
      {
        currencyCode: "usd",
        amount: 10,
      },
      {
        currencyCode: "eur",
        amount: 10,
      },
      {
        currencyCode: "czk",
        amount: 250,
      },
    ],
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
] satisfies SeedDatabaseWorkflowInput["shippingOptions"]

export const HERBATICA_PUBLISHABLE_KEY = {
  title: "Webshop",
} satisfies SeedDatabaseWorkflowInput["publishableKey"]
