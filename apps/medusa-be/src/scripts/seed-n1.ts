import type {
  ExecArgs,
  ICachingModuleService,
  Logger,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { DATABASE_MODULE } from "../modules/database"
import type DatabaseModuleService from "../modules/database/service"
import seedN1Workflow, {
  type SeedN1WorkflowInput,
} from "../workflows/seed/workflows/seed-n1"
import { type CategoryRaw, categoriesSql } from "./seed-n1/queries/categories"
import { type ProductRaw, productsSql } from "./seed-n1/queries/products"

/** Set to true to bypass cache and fetch fresh data directly from DB (dev only) */
const FORCE_FRESH_DATA = false

const CACHE_KEYS = {
  CATEGORIES: "seed-n1:categories",
  PRODUCTS: "seed-n1:products",
} as const

const CACHE_TAGS = {
  ALL: "seed-n1",
} as const

const CACHE_TTL = {
  /** 24 hours in seconds */
  DATA: 86_400,
} as const

export default async function seedN1({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  logger.info("Starting N1 seed from legacy database...")

  const countries = [
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
  ]
  const input: Omit<SeedN1WorkflowInput, "categories" | "products"> = {
    workflowDefaults: {
      fulfillmentProviderId: "manual_manual",
      shippingOptionPriceAmount: 10,
    },
    salesChannels: [
      {
        name: "Default Sales Channel",
        default: true,
      },
    ],
    currencies: [
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
    ],
    regions: [
      {
        name: "Czechia",
        currencyCode: "czk",
        countries: ["cz"],
        paymentProviders: undefined,
      },
      {
        name: "Europe",
        currencyCode: "eur",
        countries: countries.filter((c) => c !== "cz"),
        paymentProviders: undefined,
      },
    ],
    taxRegions: {
      countries,
      taxProviderId: undefined,
    },
    stockLocations: {
      locations: [
        {
          name: "European Warehouse",
          address: {
            city: "Copenhagen",
            country_code: "DK",
            address_1: "",
          },
        },
      ],
    },
    defaultShippingProfile: {
      name: "Default Shipping Profile",
    },
    fulfillmentSets: {
      name: "European Warehouse delivery",
      type: "shipping",
      serviceZones: [
        {
          name: "Europe",
          geoZones: countries.map((c) => ({
            countryCode: c,
          })),
        },
      ],
    },
    shippingOptions: [
      // Manual fulfillment options
      {
        name: "Standard Shipping",
        providerId: "manual_manual",
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
        providerId: "manual_manual",
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
      // PPL fulfillment options
      {
        name: "PPL Parcel Smart",
        providerId: "ppl_ppl",
        type: {
          label: "PPL Pickup Point",
          description: "Deliver to nearest ParcelShop/ParcelBox",
          code: "ppl-parcel-smart",
        },
        data: {
          product_type: "SMAR",
          requires_access_point: true,
          supports_cod: false,
        },
        prices: [
          {
            currencyCode: "czk",
            amount: 79,
          },
          {
            currencyCode: "eur",
            amount: 4,
          },
          {
            currencyCode: "usd",
            amount: 4,
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
        name: "PPL Parcel Smart + COD",
        providerId: "ppl_ppl",
        type: {
          label: "PPL Pickup Point + Cash on Delivery",
          description: "Deliver to ParcelShop/ParcelBox, pay on pickup",
          code: "ppl-parcel-smart-cod",
        },
        data: {
          product_type: "SMAD",
          requires_access_point: true,
          supports_cod: true,
        },
        prices: [
          {
            currencyCode: "czk",
            amount: 99,
          },
          {
            currencyCode: "eur",
            amount: 5,
          },
          {
            currencyCode: "usd",
            amount: 5,
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
        name: "PPL Private",
        providerId: "ppl_ppl",
        type: {
          label: "PPL Home Delivery",
          description: "Deliver to your address",
          code: "ppl-private",
        },
        data: {
          product_type: "PRIV",
          requires_access_point: false,
          supports_cod: false,
        },
        prices: [
          {
            currencyCode: "czk",
            amount: 99,
          },
          {
            currencyCode: "eur",
            amount: 5,
          },
          {
            currencyCode: "usd",
            amount: 5,
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
        name: "PPL Private + COD",
        providerId: "ppl_ppl",
        type: {
          label: "PPL Home Delivery + Cash on Delivery",
          description: "Deliver to your address, pay on delivery",
          code: "ppl-private-cod",
        },
        data: {
          product_type: "PRID",
          requires_access_point: false,
          supports_cod: true,
        },
        prices: [
          {
            currencyCode: "czk",
            amount: 119,
          },
          {
            currencyCode: "eur",
            amount: 6,
          },
          {
            currencyCode: "usd",
            amount: 6,
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
    ],
    publishableKey: {
      title: "Webshop",
    },
  }

  const dbService: DatabaseModuleService = container.resolve(DATABASE_MODULE)
  const cacheService = container.resolve<ICachingModuleService>(Modules.CACHING)

  // Helper to get cached data or fetch fresh
  async function getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    label: string
  ): Promise<T> {
    // Check cache first (unless forcing fresh data)
    if (FORCE_FRESH_DATA) {
      logger.info(`FORCE_FRESH_DATA enabled, skipping cache for ${label}`)
    } else {
      const cached = (await cacheService.get({ key })) as T | null
      if (cached !== null) {
        logger.info(`Using cached ${label}`)
        return cached
      }
    }

    // Fetch fresh data
    logger.info(`Fetching ${label} from legacy database...`)
    const data = await fetcher()

    // Store in cache
    await cacheService.set({
      key,
      data: data as object,
      ttl: CACHE_TTL.DATA,
      tags: [CACHE_TAGS.ALL],
    })
    logger.info(`Cached ${label} for 24 hours`)

    return data
  }

  const [resultCategories, resultProducts] = await Promise.all([
    getCachedOrFetch<CategoryRaw[]>(
      CACHE_KEYS.CATEGORIES,
      () => dbService.sqlRaw<CategoryRaw>(categoriesSql),
      "categories"
    ),
    getCachedOrFetch<ProductRaw[]>(
      CACHE_KEYS.PRODUCTS,
      () => dbService.sqlRaw<ProductRaw>(productsSql),
      "products"
    ),
  ])
  logger.info(
    `Found ${resultCategories.length} categories, ${resultProducts.length} products`
  )

  logger.info("Running seed workflow...")
  const { result } = await seedN1Workflow(container).run({
    input: { ...input, categories: resultCategories, products: resultProducts },
  })

  logger.info("N1 seed completed successfully")
  logger.info(`Result: ${JSON.stringify(result, null, 2)}`)
}
