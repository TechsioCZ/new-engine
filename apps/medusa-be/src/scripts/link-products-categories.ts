import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type ProductCategoryRecord = {
  handle: string
  id: string
}

type ProductRecord = {
  categories?: { id: string }[]
  handle: string
  id: string
}

type ProductService = {
  listProductCategories: (
    filters: Record<string, unknown>
  ) => Promise<ProductCategoryRecord[]>
  listProducts: (
    filters: Record<string, unknown>,
    config?: { relations?: string[] }
  ) => Promise<ProductRecord[]>
  updateProducts: (
    id: string,
    data: { category_ids: string[] }
  ) => Promise<unknown>
}

// Mapping of product handles to category handles
const productCategoryMapping: Record<string, string[]> = {
  // T-Shirts & Tops
  "t-shirt": ["t-shirts-tops"],
  "white-cotton-t-shirt": ["t-shirts-tops"],
  "classic-oxford-shirt": ["t-shirts-tops"],
  "linen-button-up-shirt": ["t-shirts-tops"],
  "wrap-blouse": ["t-shirts-tops"],

  // Jeans & Pants
  sweatpants: ["jeans-pants"],
  "blue-denim-jeans": ["jeans-pants"],
  "slim-fit-chinos": ["jeans-pants"],
  "cargo-pants": ["jeans-pants"],
  "wide-leg-trousers": ["jeans-pants"],
  shorts: ["jeans-pants"],

  // Shoes & Sneakers
  "sport-running-shoes": ["shoes-sneakers"],
  "high-top-canvas-sneakers": ["shoes-sneakers"],
  loafers: ["shoes-sneakers"],
  "chelsea-boots": ["shoes-sneakers"],

  // Jackets & Coats
  "black-leather-jacket": ["jackets-coats"],
  "wool-blend-coat": ["jackets-coats"],
  "denim-jacket": ["jackets-coats"],
  "bomber-jacket": ["jackets-coats"],
  "track-jacket": ["jackets-coats", "activewear"], // Can be in multiple categories

  // Dresses
  "striped-summer-dress": ["dresses"],
  "maxi-dress": ["dresses"],

  // Accessories
  "casual-canvas-backpack": ["accessories"],
  "wool-winter-scarf": ["accessories"],
  "leather-crossbody-bag": ["accessories"],
  "baseball-cap": ["accessories"],
  "silk-blend-scarf": ["accessories"],
  "bucket-hat": ["accessories"],

  // Knitwear
  sweatshirt: ["knitwear"],
  "cashmere-v-neck-sweater": ["knitwear"],
  "turtleneck-sweater": ["knitwear"],
  cardigan: ["knitwear"],

  // Activewear
  "athletic-performance-leggings": ["activewear"],

  // Skirts
  "pleated-midi-skirt": ["skirts"],
}

async function logCategoryProductCounts(
  productService: ProductService,
  categories: ProductCategoryRecord[],
  logger: Logger
) {
  for (const category of categories) {
    const productsInCategory = await productService.listProducts({
      categories: { id: category.id },
    })

    const count = productsInCategory.length
    if (count > 0) {
      logger.info(`Category ${category.handle} has ${count} products`)
    }
  }
}

export default async function linkProductsToCategories({
  container,
}: ExecArgs) {
  const productService = container.resolve<ProductService>(Modules.PRODUCT)
  const logger = container.resolve<Logger>("logger")

  logger.info("Starting to link products to categories...")

  // Get all categories
  const categories = await productService.listProductCategories({})
  const categoryMap = categories.reduce(
    (acc, cat) => {
      acc[cat.handle] = cat.id
      return acc
    },
    {} as Record<string, string>
  )

  logger.info(`Found ${categories.length} categories`)

  // Get all products
  const products = await productService.listProducts(
    {},
    {
      relations: ["categories"],
    }
  )

  logger.info(`Found ${products.length} products`)

  let linkedCount = 0

  // Link products to categories
  for (const product of products) {
    const categoryHandles = productCategoryMapping[product.handle]

    if (!categoryHandles) {
      logger.warn(`No category mapping found for product: ${product.handle}`)
      continue
    }

    const categoryIds = categoryHandles
      .map((handle) => categoryMap[handle])
      .filter((id) => typeof id === "string")

    if (categoryIds.length === 0) {
      logger.warn(
        `No category IDs found for handles: ${categoryHandles.join(", ")}`
      )
      continue
    }

    // Check if product already has categories
    const existingCategoryIds = product.categories?.map((c) => c.id) || []
    const newCategoryIds = categoryIds.filter(
      (id) => !existingCategoryIds.includes(id)
    )

    if (newCategoryIds.length === 0) {
      logger.info(`Product ${product.handle} already has all categories`)
      continue
    }

    try {
      // Update product with categories
      await productService.updateProducts(product.id, {
        category_ids: [...existingCategoryIds, ...newCategoryIds],
      })

      linkedCount += 1
      logger.info(
        `Linked product ${product.handle} to ${newCategoryIds.length} new categories`
      )
    } catch (error) {
      logger.error(
        `Failed to link product ${product.handle}:`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  logger.info(`Successfully linked ${linkedCount} products to categories`)

  await logCategoryProductCounts(productService, categories, logger)

  logger.info("Finished linking products to categories!")
}
