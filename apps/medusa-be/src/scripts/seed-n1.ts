import type {
  ExecArgs,
  ICachingModuleService,
  Logger,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { sql } from "drizzle-orm"

import { DATABASE_MODULE } from "../modules/database"
import type DatabaseModuleService from "../modules/database/service"
import seedN1Workflow from "../workflows/seed/workflows/seed-n1"
import type { SeedN1WorkflowInput } from "../workflows/seed/workflows/seed-n1"
import { categoriesSql } from "./seed-n1/queries/categories"
import type { CategoryRaw } from "./seed-n1/queries/categories"
import { productsSql } from "./seed-n1/queries/products"
import type { ProductRaw } from "./seed-n1/queries/products"
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

const categoryRawArraySchema = z.array(
  z.object({
    description: z.string(),
    handle: z.string(),
    isActive: z.boolean(),
    parentHandle: z.union([z.string(), z.undefined()]),
    title: z.string(),
  }),
)

const productRawArraySchema = z.array(
  z.object({
    brand: z.string(),
    categories: z.string(),
    description: z.string().optional(),
    handle: z.string(),
    images: z.string(),
    options: z.string(),
    thumbnail: z.string().optional(),
    title: z.string(),
    variants: z.string(),
  }),
)

const readCategoryRawArray = (value: unknown): CategoryRaw[] | undefined => {
  const parsed = categoryRawArraySchema.safeParse(value)
  if (!parsed.success) {
    return undefined
  }
  return parsed.data.map((category) => ({
    ...category,
    parentHandle: category.parentHandle,
  }))
}

const readProductRawArray = (value: unknown): ProductRaw[] | undefined => {
  const parsed = productRawArraySchema.safeParse(value)
  if (!parsed.success) {
    return undefined
  }
  return parsed.data.map((product) => ({
    brand: product.brand,
    categories: product.categories,
    handle: product.handle,
    images: product.images,
    options: product.options,
    title: product.title,
    variants: product.variants,
    ...(product.description === undefined
      ? {}
      : { description: product.description }),
    ...(product.thumbnail === undefined
      ? {}
      : { thumbnail: product.thumbnail }),
  }))
}

const requireCategoryRawArray = (value: unknown): CategoryRaw[] => {
  const categories = readCategoryRawArray(value)
  if (categories === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Legacy database returned invalid category rows",
    )
  }
  return categories
}

const requireProductRawArray = (value: unknown): ProductRaw[] => {
  const products = readProductRawArray(value)
  if (products === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Legacy database returned invalid product rows",
    )
  }
  return products
}

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
    defaultShippingProfile: {
      name: "Default Shipping Profile",
    },
    fulfillmentSets: {
      name: "European Warehouse delivery",
      serviceZones: [
        {
          geoZones: countries.map((c) => ({
            countryCode: c,
          })),
          name: "Europe",
        },
      ],
      type: "shipping",
    },
    publishableKey: {
      title: "Webshop",
    },
    regions: [
      {
        countries: ["cz"],
        currencyCode: "czk",
        name: "Czechia",
      },
      {
        countries: countries.filter((c) => c !== "cz"),
        currencyCode: "eur",
        name: "Europe",
      },
    ],
    salesChannels: [
      {
        default: true,
        name: "Default Sales Channel",
      },
    ],
    shippingOptions: [
      // Manual fulfillment options
      {
        name: "Standard Shipping",
        prices: [
          {
            amount: 10,
            currencyCode: "usd",
          },
          {
            amount: 10,
            currencyCode: "eur",
          },
          {
            amount: 250,
            currencyCode: "czk",
          },
        ],
        providerId: "manual_manual",
        rules: [
          {
            attribute: "enabled_in_store",
            operator: "eq",
            value: "true",
          },
          {
            attribute: "is_return",
            operator: "eq",
            value: "false",
          },
        ],
        type: {
          code: "standard",
          description: "Ship in 2-3 days.",
          label: "Standard",
        },
      },
      {
        name: "Express Shipping",
        prices: [
          {
            amount: 10,
            currencyCode: "usd",
          },
          {
            amount: 10,
            currencyCode: "eur",
          },
          {
            amount: 250,
            currencyCode: "czk",
          },
        ],
        providerId: "manual_manual",
        rules: [
          {
            attribute: "enabled_in_store",
            operator: "eq",
            value: "true",
          },
          {
            attribute: "is_return",
            operator: "eq",
            value: "false",
          },
        ],
        type: {
          code: "express",
          description: "Ship in 24 hours.",
          label: "Express",
        },
      },
      // PPL fulfillment options
      {
        data: {
          product_type: "SMAR",
          requires_access_point: true,
          supports_cod: false,
        },
        name: "PPL Parcel Smart",
        prices: [
          {
            amount: 79,
            currencyCode: "czk",
          },
          {
            amount: 4,
            currencyCode: "eur",
          },
          {
            amount: 4,
            currencyCode: "usd",
          },
        ],
        providerId: "ppl_ppl",
        rules: [
          {
            attribute: "enabled_in_store",
            operator: "eq",
            value: "true",
          },
          {
            attribute: "is_return",
            operator: "eq",
            value: "false",
          },
        ],
        type: {
          code: "ppl-parcel-smart",
          description: "Deliver to nearest ParcelShop/ParcelBox",
          label: "PPL Pickup Point",
        },
      },
      {
        data: {
          product_type: "SMAD",
          requires_access_point: true,
          supports_cod: true,
        },
        name: "PPL Parcel Smart + COD",
        prices: [
          {
            amount: 99,
            currencyCode: "czk",
          },
          {
            amount: 5,
            currencyCode: "eur",
          },
          {
            amount: 5,
            currencyCode: "usd",
          },
        ],
        providerId: "ppl_ppl",
        rules: [
          {
            attribute: "enabled_in_store",
            operator: "eq",
            value: "true",
          },
          {
            attribute: "is_return",
            operator: "eq",
            value: "false",
          },
        ],
        type: {
          code: "ppl-parcel-smart-cod",
          description: "Deliver to ParcelShop/ParcelBox, pay on pickup",
          label: "PPL Pickup Point + Cash on Delivery",
        },
      },
      {
        data: {
          product_type: "PRIV",
          requires_access_point: false,
          supports_cod: false,
        },
        name: "PPL Private",
        prices: [
          {
            amount: 99,
            currencyCode: "czk",
          },
          {
            amount: 5,
            currencyCode: "eur",
          },
          {
            amount: 5,
            currencyCode: "usd",
          },
        ],
        providerId: "ppl_ppl",
        rules: [
          {
            attribute: "enabled_in_store",
            operator: "eq",
            value: "true",
          },
          {
            attribute: "is_return",
            operator: "eq",
            value: "false",
          },
        ],
        type: {
          code: "ppl-private",
          description: "Deliver to your address",
          label: "PPL Home Delivery",
        },
      },
      {
        data: {
          product_type: "PRID",
          requires_access_point: false,
          supports_cod: true,
        },
        name: "PPL Private + COD",
        prices: [
          {
            amount: 119,
            currencyCode: "czk",
          },
          {
            amount: 6,
            currencyCode: "eur",
          },
          {
            amount: 6,
            currencyCode: "usd",
          },
        ],
        providerId: "ppl_ppl",
        rules: [
          {
            attribute: "enabled_in_store",
            operator: "eq",
            value: "true",
          },
          {
            attribute: "is_return",
            operator: "eq",
            value: "false",
          },
        ],
        type: {
          code: "ppl-private-cod",
          description: "Deliver to your address, pay on delivery",
          label: "PPL Home Delivery + Cash on Delivery",
        },
      },
    ],
    stockLocations: {
      locations: [
        {
          address: {
            address_1: "",
            city: "Copenhagen",
            country_code: "DK",
          },
          name: "European Warehouse",
        },
      ],
    },
    taxRegions: {
      countries,
    },
    workflowDefaults: {
      fulfillmentProviderId: "manual_manual",
      shippingOptionPriceAmount: 10,
    },
  }
  const dbService: DatabaseModuleService = container.resolve(DATABASE_MODULE)
  const cacheService = container.resolve<ICachingModuleService>(Modules.CACHING)
  // Helper to get cached data or fetch fresh
  const getCachedOrFetch = async <T extends object>(
    key: string,
    fetcher: () => Promise<T>,
    readCachedValue: (value: unknown) => T | undefined,
    label: string,
  ): Promise<T> => {
    // Check cache first (unless forcing fresh data)
    if (FORCE_FRESH_DATA) {
      logger.info(`FORCE_FRESH_DATA enabled, skipping cache for ${label}`)
    } else {
      const cached = readCachedValue(await cacheService.get({ key }))
      if (cached !== undefined) {
        logger.info(`Using cached ${label}`)
        return cached
      }
    }
    // Fetch fresh data
    logger.info(`Fetching ${label} from legacy database...`)
    const data = await fetcher()
    // Store in cache
    await cacheService.set({
      data,
      key,
      tags: [CACHE_TAGS.ALL],
      ttl: CACHE_TTL.DATA,
    })
    logger.info(`Cached ${label} for 24 hours`)
    return data
  }
  const [resultCategories, resultProducts] = await Promise.all([
    getCachedOrFetch<CategoryRaw[]>(
      CACHE_KEYS.CATEGORIES,
      async () =>
        requireCategoryRawArray(
          await dbService.sqlRaw(sql<object>`${categoriesSql}`),
        ),
      readCategoryRawArray,
      "categories",
    ),
    getCachedOrFetch<ProductRaw[]>(
      CACHE_KEYS.PRODUCTS,
      async () =>
        requireProductRawArray(
          await dbService.sqlRaw(sql<object>`${productsSql}`),
        ),
      readProductRawArray,
      "products",
    ),
  ])
  logger.info(
    `Found ${resultCategories.length} categories, ${resultProducts.length} products`,
  )
  logger.info("Running seed workflow...")
  const { result } = await seedN1Workflow(container).run({
    input: { ...input, categories: resultCategories, products: resultProducts },
  })
  logger.info("N1 seed completed successfully")
  logger.info(`Result: ${JSON.stringify(result, null, 2)}`)
}
