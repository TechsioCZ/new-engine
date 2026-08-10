import type {
  CreateProductWorkflowInputDTO,
  ExecArgs,
  Logger,
  MedusaContainer,
  ProductCategoryDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { sql } from "drizzle-orm"

import { sqlRaw } from "../utils/db"

const CHUNK_SIZE = 50

// Product record shape from the database
interface ProductRecord {
  product_slug: string
  product_name: string
  product_description: string
  product_price: number
  product_image_url: string
  subcategory_slug: string
  subcategory_name: string
  subcategory_image_url: string
  subcollection_name: string
  category_slug: string
  category_name: string
  category_image_url: string
  collection_slug: string
  collection_name: string
}

const productRecordSchema = z.object({
  category_image_url: z.string(),
  category_name: z.string(),
  category_slug: z.string(),
  collection_name: z.string(),
  collection_slug: z.string(),
  product_description: z.string(),
  product_image_url: z.string(),
  product_name: z.string(),
  product_price: z.number(),
  product_slug: z.string(),
  subcategory_image_url: z.string(),
  subcategory_name: z.string(),
  subcategory_slug: z.string(),
  subcollection_name: z.string(),
})

const decodeProductRecord = (row: object, index: number): ProductRecord => {
  const parsed = productRecordSchema.safeParse(row)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product import row ${index} has invalid data`,
    )
  }
  return parsed.data
}

interface ImportPageResult {
  createdCount: number
  hasMore: boolean
}

/**
 * Import a page of products from the database
 */
const importProductPage = async (
  page: number,
  step = 10,
): Promise<ProductRecord[]> =>
  // Query products with pagination
  await sqlRaw(
    sql`
      SELECT
        p.slug AS product_slug,
        p.name AS product_name,
        p.description AS product_description,
        p.price AS product_price,
        p.image_url AS product_image_url,
        sca.slug AS subcategory_slug,
        sca.name AS subcategory_name,
        sca.image_url AS subcategory_image_url,
        sco.name AS subcollection_name,
        ca.slug AS category_slug,
        ca.name AS category_name,
        ca.image_url AS category_image_url,
        cl.slug AS collection_slug,
        cl.name AS collection_name
      FROM products p
      JOIN subcategories sca ON sca.slug = p.subcategory_slug
      JOIN subcollections sco ON sco.id = sca.subcollection_id
      JOIN categories ca ON ca.slug = sco.category_slug
      JOIN collections cl ON cl.id = ca.collection_id
      LIMIT ${step}
      OFFSET ${page * step}`,
    decodeProductRecord,
  )

let i = 0
const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}/u
/**
 * Sanitize a string to be URL-safe for use as a handle
 */
const sanitizeHandle = (handle: string): string => {
  if (!handle) {
    i += 1
    return `product-${i}-${Date.now()}`
  }

  // Check if the handle is a date string (common issue with database exports)
  if (DATE_STRING_PATTERN.exec(handle) || !Number.isNaN(Date.parse(handle))) {
    i += 1
    return `product-${i}-${Date.now()}`
  }

  return (
    handle
      .toLowerCase()
      // Replace any character that's not alphanumeric, dash, or underscore with a dash
      .replaceAll(/[^a-z0-9-_]/gu, "-")
      // Replace multiple consecutive dashes with a single dash
      .replaceAll(/-+/gu, "-")
      // Remove leading and trailing dashes
      .replaceAll(/^-|-$/gu, "")
  )
}

/**
 * Convert products from database format to MedusaJS format
 */
const convertToMedusaProducts = (
  products: ProductRecord[],
  defaultSalesChannelId: string,
  categoryMap: Record<string, string>,
) =>
  products.map((product) => {
    const safeHandle = sanitizeHandle(product.product_name)
    // If we have category information and it exists in our map, use it
    const categoryId = product.category_slug
      ? categoryMap[product.category_slug]
      : undefined

    return {
      category_ids: categoryId === undefined ? [] : [categoryId],
      description: product.product_description,
      handle: safeHandle,
      // If we have image URLs, convert them to the expected format
      // Note: This assumes images are already uploaded somewhere accessible
      options: [
        {
          title: "Default",
          values: ["Default"],
        },
      ],
      // Link to default sales channel
      sales_channels: [
        {
          id: defaultSalesChannelId,
        },
      ],
      status: ProductStatus.PUBLISHED,
      ...(product.product_image_url
        ? { thumbnail: product.product_image_url }
        : {}),
      title: product.product_name,
      variants: [
        {
          prices: [
            {
              amount: product.product_price,
              currency_code: "eur",
            },
            {
              // Simple USD conversion
              amount: product.product_price * 1.1,
              currency_code: "usd",
            },
          ],
          // Use sanitized handle for SKU as well
          sku: `SKU-${safeHandle}`,
          title: "Default",
        },
      ],
    } satisfies CreateProductWorkflowInputDTO
  })

/**
 * Check if categories already exist in the system by handle
 */
const checkExistingCategories = async (
  container: MedusaContainer,
  categoryHandles: string[],
): Promise<Record<string, string>> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Query for existing categories with the given handles
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    filters: {
      handle: categoryHandles,
    },
  })

  // Create a map of handle -> id for existing categories
  const existingCategoryMap: Record<string, string> = {}
  for (const category of existingCategories) {
    existingCategoryMap[category.handle] = category.id
  }

  return existingCategoryMap
}

/**
 * Check if collections already exist in the system by handle
 */
const checkExistingCollections = async (
  container: MedusaContainer,
  collectionHandles: string[],
): Promise<Record<string, string>> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Query for existing collections with the given handles
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
    filters: {
      handle: collectionHandles,
    },
  })

  // Create a map of handle -> id for existing collections
  const existingCollectionMap: Record<string, string> = {}
  for (const collection of existingCollections) {
    existingCollectionMap[collection.handle] = collection.id
  }

  return existingCollectionMap
}

/**
 * Check if products already exist in the system by handle
 */
const checkExistingProducts = async (
  container: MedusaContainer,
  productHandles: string[],
): Promise<Record<string, string>> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Query for existing products with the given handles
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: {
      handle: productHandles,
    },
  })

  // Create a map of handle -> id for existing products
  const existingProductMap: Record<string, string> = {}
  for (const product of existingProducts) {
    existingProductMap[product.handle] = product.id
  }

  return existingProductMap
}

/**
 * Extract unique categories from product records
 */
const extractCategories = (
  products: ProductRecord[],
): {
  slug: string
  name: string
  image_url?: string
}[] => {
  const categoriesMap: Record<
    string,
    { slug: string; name: string; image_url?: string }
  > = {}

  for (const product of products) {
    if (product.category_slug && !categoriesMap[product.category_slug]) {
      categoriesMap[product.category_slug] = {
        image_url: product.category_image_url,
        name: product.category_name,
        slug: product.category_slug,
      }
    }
  }

  return Object.values(categoriesMap)
}

/**
 * Extract unique collections from product records
 */
const extractCollections = (
  products: ProductRecord[],
): {
  handle: string
  title: string
}[] => {
  const collectionsMap: Record<string, { handle: string; title: string }> = {}

  for (const product of products) {
    if (product.collection_slug && !collectionsMap[product.collection_slug]) {
      collectionsMap[product.collection_slug] = {
        handle: product.collection_slug,
        title: product.collection_name,
      }
    }
  }

  return Object.values(collectionsMap)
}

const getDefaultSalesChannelId = async (
  container: MedusaContainer,
  logger: Logger,
): Promise<string> => {
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const defaultSalesChannel = await salesChannelModuleService.listSalesChannels(
    {
      name: "Default Sales Channel",
    },
  )

  const [firstSalesChannel] = defaultSalesChannel
  if (!firstSalesChannel) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Default Sales Channel not found. Please run the seed script first.",
    )
  }

  logger.info(`Found default sales channel with ID: ${firstSalesChannel.id}`)
  return firstSalesChannel.id
}

const loadSampleProducts = async (logger: Logger): Promise<ProductRecord[]> => {
  logger.info("Fetching initial product data for category extraction...")
  const sampleProducts = await importProductPage(0, 10)

  if (sampleProducts.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No products found in the database",
    )
  }

  return sampleProducts
}

const buildCategoryMap = (
  existingCategoryMap: Record<string, string>,
  categoryResult: ProductCategoryDTO[],
): Record<string, string> => {
  const categoryMap: Record<string, string> = { ...existingCategoryMap }
  for (const category of categoryResult) {
    if (category.handle) {
      categoryMap[category.handle] = category.id
    }
  }
  return categoryMap
}

const ensureCategoryMap = async (
  container: MedusaContainer,
  logger: Logger,
  sampleProducts: ProductRecord[],
): Promise<Record<string, string>> => {
  logger.info("Extracting categories from product data...")
  const categories = extractCategories(sampleProducts)
  logger.info(`Found ${categories.length} unique categories`)

  const categoryHandles = categories.map((category) => category.slug)
  logger.info("Checking for existing categories...")
  const existingCategoryMap = await checkExistingCategories(
    container,
    categoryHandles,
  )

  const newCategories = categories.filter(
    (category) => existingCategoryMap[category.slug] === undefined,
  )
  logger.info(
    `Found ${Object.keys(existingCategoryMap).length} existing categories, creating ${newCategories.length} new categories`,
  )

  const productCategories = newCategories.map((category) => ({
    handle: category.slug,
    is_active: true,
    is_internal: false,
    name: category.name,
    ...(category.image_url !== undefined && category.image_url !== ""
      ? { metadata: { image_url: category.image_url } }
      : {}),
  }))

  let categoryResult: ProductCategoryDTO[] = []
  if (productCategories.length > 0) {
    logger.info("Creating product categories...")
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: productCategories,
      },
    })
    categoryResult = result
    logger.info(`Successfully created ${categoryResult.length} new categories`)
  } else {
    logger.info("No new categories to create, using existing ones")
  }

  return buildCategoryMap(existingCategoryMap, categoryResult)
}

const ensureCollections = async (
  container: MedusaContainer,
  logger: Logger,
  sampleProducts: ProductRecord[],
) => {
  logger.info("Extracting collections from product data...")
  const collections = extractCollections(sampleProducts)
  logger.info(`Found ${collections.length} unique collections`)

  const collectionHandles = collections.map((collection) => collection.handle)
  logger.info("Checking for existing collections...")
  const existingCollectionMap = await checkExistingCollections(
    container,
    collectionHandles,
  )

  const newCollections = collections.filter(
    (collection) => existingCollectionMap[collection.handle] === undefined,
  )
  logger.info(
    `Found ${Object.keys(existingCollectionMap).length} existing collections, creating ${newCollections.length} new collections`,
  )

  let collectionResult: { handle: string; id: string }[] = []
  if (newCollections.length > 0) {
    logger.info("Creating new collections...")
    const { result } = await createCollectionsWorkflow(container).run({
      input: {
        collections: newCollections,
      },
    })
    collectionResult = result
    logger.info(
      `Successfully created ${collectionResult.length} new collections`,
    )
  } else {
    logger.info("No new collections to create, using existing ones")
  }
}

const ensureDefaultStockLocation = async (
  container: MedusaContainer,
  logger: Logger,
): Promise<string> => {
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
  const existingStockLocations = await stockLocationService.listStockLocations({
    name: "Default Warehouse",
  })

  if (existingStockLocations.length > 0 && existingStockLocations[0]) {
    const stockLocationId = existingStockLocations[0].id
    logger.info(`Using existing stock location: ${stockLocationId}`)
    return stockLocationId
  }

  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container,
  ).run({
    input: {
      locations: [
        {
          address: {
            address_1: "123 Demo Street",
            city: "Demo City",
            country_code: "us",
          },
          name: "Default Warehouse",
        },
      ],
    },
  })
  if (!stockLocationResult[0]) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to create stock location",
    )
  }
  const stockLocationId = stockLocationResult[0].id
  logger.info(`Created stock location: ${stockLocationId}`)
  return stockLocationId
}

/**
 * Read a product's handle, validating that it is a non-empty string
 */
const getProductHandle = (product: CreateProductWorkflowInputDTO): string => {
  if (typeof product.handle !== "string") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product is missing a handle",
    )
  }
  return product.handle
}

const getProductHandles = (
  products: CreateProductWorkflowInputDTO[],
): string[] => products.map((product) => getProductHandle(product))

const selectNewProducts = async (
  container: MedusaContainer,
  logger: Logger,
  products: CreateProductWorkflowInputDTO[],
): Promise<CreateProductWorkflowInputDTO[]> => {
  const productHandles = getProductHandles(products)
  logger.info(
    `Checking for existing products with ${productHandles.length} handles...`,
  )
  const existingProductMap = await checkExistingProducts(
    container,
    productHandles,
  )
  const newProducts = products.filter((product) => {
    const handle = getProductHandle(product)
    return existingProductMap[handle] === undefined
  })
  logger.info(
    `Found ${Object.keys(existingProductMap).length} existing products, creating ${newProducts.length} new products`,
  )
  return newProducts
}

const setInventoryLevelsForLocation = async (
  container: MedusaContainer,
  logger: Logger,
  stockLocationId: string,
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })

  const inventoryLevels: {
    stocked_quantity: number
    inventory_item_id: string
    location_id: string
  }[] = []
  for (const inventoryItem of inventoryItems) {
    inventoryLevels.push({
      inventory_item_id: inventoryItem.id,
      location_id: stockLocationId,
      stocked_quantity: 100,
    })
  }

  if (inventoryLevels.length === 0) {
    return
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  })
  logger.info(`Set inventory levels for ${inventoryLevels.length} variants`)
}

const importProductBatch = async ({
  categoryMap,
  container,
  defaultSalesChannelId,
  logger,
  page,
  stockLocationId,
}: {
  categoryMap: Record<string, string>
  container: MedusaContainer
  defaultSalesChannelId: string
  logger: Logger
  page: number
  stockLocationId: string
}): Promise<ImportPageResult> => {
  logger.info(`Processing page ${page + 1}, offset: ${page * CHUNK_SIZE}`)
  const productRecords = await importProductPage(page, CHUNK_SIZE)

  if (productRecords.length === 0) {
    logger.info("No more products to import")
    return {
      createdCount: 0,
      hasMore: false,
    }
  }

  const medusaProducts = convertToMedusaProducts(
    productRecords,
    defaultSalesChannelId,
    categoryMap,
  )
  const newProducts = await selectNewProducts(container, logger, medusaProducts)

  if (newProducts.length === 0) {
    logger.info("No new products to create in this batch, skipping...")
    return {
      createdCount: 0,
      hasMore: productRecords.length >= CHUNK_SIZE,
    }
  }

  logger.info(`Importing ${newProducts.length} products (batch ${page + 1})...`)
  const { result: createdProducts } = await createProductsWorkflow(
    container,
  ).run({
    input: {
      products: newProducts,
    },
  })
  logger.info(`Successfully created ${createdProducts.length} products`)
  await setInventoryLevelsForLocation(container, logger, stockLocationId)

  return {
    createdCount: createdProducts.length,
    hasMore: productRecords.length >= CHUNK_SIZE,
  }
}

const logImportError = (
  error: unknown,
  logger: Logger,
  page: number,
): string => {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  logger.error(
    `Error importing products at page ${page}: ${errorMessage}\n${errorStack ?? ""}`,
  )
  return errorMessage
}

const importProductPages = async ({
  categoryMap,
  container,
  defaultSalesChannelId,
  logger,
  stockLocationId,
}: {
  categoryMap: Record<string, string>
  container: MedusaContainer
  defaultSalesChannelId: string
  logger: Logger
  stockLocationId: string
}): Promise<number> => {
  logger.info(`Starting product import with chunk size: ${CHUNK_SIZE}`)

  const runPage = async (
    page: number,
    totalImported: number,
  ): Promise<number> => {
    try {
      const result = await importProductBatch({
        categoryMap,
        container,
        defaultSalesChannelId,
        logger,
        page,
        stockLocationId,
      })
      const nextTotalImported = totalImported + result.createdCount
      logger.info(`Total products imported so far: ${nextTotalImported}`)

      if (!result.hasMore) {
        return nextTotalImported
      }

      return await runPage(page + 1, nextTotalImported)
    } catch (error) {
      const errorMessage = logImportError(error, logger, page)
      const nextPage = page + 1

      if (nextPage > 3 && totalImported === 0) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Failed to import products after multiple attempts: ${errorMessage}`,
        )
      }

      return await runPage(nextPage, totalImported)
    }
  }

  return await runPage(0, 0)
}

export default async function seedProductsFromDb({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  logger.info("Starting bulk product import from database...")

  const defaultSalesChannelId = await getDefaultSalesChannelId(
    container,
    logger,
  )
  const sampleProducts = await loadSampleProducts(logger)
  const categoryMap = await ensureCategoryMap(container, logger, sampleProducts)
  await ensureCollections(container, logger, sampleProducts)
  const stockLocationId = await ensureDefaultStockLocation(container, logger)
  const totalImported = await importProductPages({
    categoryMap,
    container,
    defaultSalesChannelId,
    logger,
    stockLocationId,
  })

  logger.info(
    `Product import completed. Total products imported: ${totalImported}`,
  )
}
