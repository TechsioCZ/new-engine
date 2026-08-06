import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

interface ProductCategoryRecord {
  handle: string
  id: string
}

interface ProductRecord {
  categories?: { id: string }[]
  handle: string
  id: string
}

interface ProductService {
  listProductCategories: (
    filters: Record<string, unknown>,
  ) => Promise<ProductCategoryRecord[]>
  listProducts: (
    filters: Record<string, unknown>,
    config?: { relations?: string[] },
  ) => Promise<ProductRecord[]>
  updateProducts: (
    id: string,
    data: { category_ids: string[] },
  ) => Promise<unknown>
}

const T_SHIRTS_TOPS = "t-shirts-tops"
const JEANS_PANTS = "jeans-pants"
const SHOES_SNEAKERS = "shoes-sneakers"
const JACKETS_COATS = "jackets-coats"
const ACCESSORIES = "accessories"
const KNITWEAR = "knitwear"

const productCategoryMapping: Record<string, string[]> = {
  "athletic-performance-leggings": ["activewear"],
  "baseball-cap": [ACCESSORIES],
  "black-leather-jacket": [JACKETS_COATS],
  "blue-denim-jeans": [JEANS_PANTS],
  "bomber-jacket": [JACKETS_COATS],
  "bucket-hat": [ACCESSORIES],
  cardigan: [KNITWEAR],
  "cargo-pants": [JEANS_PANTS],
  "cashmere-v-neck-sweater": [KNITWEAR],
  "casual-canvas-backpack": [ACCESSORIES],
  "chelsea-boots": [SHOES_SNEAKERS],
  "classic-oxford-shirt": [T_SHIRTS_TOPS],
  "denim-jacket": [JACKETS_COATS],
  "high-top-canvas-sneakers": [SHOES_SNEAKERS],
  "leather-crossbody-bag": [ACCESSORIES],
  "linen-button-up-shirt": [T_SHIRTS_TOPS],
  loafers: [SHOES_SNEAKERS],
  "maxi-dress": ["dresses"],
  "pleated-midi-skirt": ["skirts"],
  shorts: [JEANS_PANTS],
  "silk-blend-scarf": [ACCESSORIES],
  "slim-fit-chinos": [JEANS_PANTS],
  "sport-running-shoes": [SHOES_SNEAKERS],
  "striped-summer-dress": ["dresses"],
  sweatpants: [JEANS_PANTS],
  sweatshirt: [KNITWEAR],
  "t-shirt": [T_SHIRTS_TOPS],
  "track-jacket": [JACKETS_COATS, "activewear"],
  "turtleneck-sweater": [KNITWEAR],
  "white-cotton-t-shirt": [T_SHIRTS_TOPS],
  "wide-leg-trousers": [JEANS_PANTS],
  "wool-blend-coat": [JACKETS_COATS],
  "wool-winter-scarf": [ACCESSORIES],
  "wrap-blouse": [T_SHIRTS_TOPS],
}

const logCategoryProductCounts = async (
  productService: ProductService,
  categories: ProductCategoryRecord[],
  logger: Logger,
) => {
  const logCategoryAtIndex = async (index: number): Promise<void> => {
    const category = categories[index]
    if (category === undefined) {
      return
    }

    const productsInCategory = await productService.listProducts({
      categories: { id: category.id },
    })
    const count = productsInCategory.length
    if (count > 0) {
      logger.info(`Category ${category.handle} has ${count} products`)
    }

    await logCategoryAtIndex(index + 1)
  }

  await logCategoryAtIndex(0)
}

export default async function linkProductsToCategories({
  container,
}: ExecArgs) {
  const productService = container.resolve<ProductService>(Modules.PRODUCT)
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  logger.info("Starting to link products to categories...")

  const categories = await productService.listProductCategories({})
  const categoryMap = new Map<string, string>()
  for (const category of categories) {
    categoryMap.set(category.handle, category.id)
  }
  logger.info(`Found ${categories.length} categories`)

  const products = await productService.listProducts(
    {},
    {
      relations: ["categories"],
    },
  )
  logger.info(`Found ${products.length} products`)

  const linkProduct = async (product: ProductRecord): Promise<boolean> => {
    const categoryHandles = productCategoryMapping[product.handle]
    if (categoryHandles === undefined) {
      logger.warn(`No category mapping found for product: ${product.handle}`)
      return false
    }

    const categoryIds: string[] = []
    for (const handle of categoryHandles) {
      const categoryId = categoryMap.get(handle)
      if (categoryId !== undefined) {
        categoryIds.push(categoryId)
      }
    }
    if (categoryIds.length === 0) {
      logger.warn(
        `No category IDs found for handles: ${categoryHandles.join(", ")}`,
      )
      return false
    }

    const existingCategoryIds =
      product.categories?.map((category) => category.id) ?? []
    const newCategoryIds = categoryIds.filter(
      (id) => !existingCategoryIds.includes(id),
    )
    if (newCategoryIds.length === 0) {
      logger.info(`Product ${product.handle} already has all categories`)
      return false
    }

    try {
      await productService.updateProducts(product.id, {
        category_ids: [...existingCategoryIds, ...newCategoryIds],
      })
      logger.info(
        `Linked product ${product.handle} to ${newCategoryIds.length} new categories`,
      )
      return true
    } catch (error) {
      logger.error(
        `Failed to link product ${product.handle}:`,
        error instanceof Error ? error : new Error(String(error)),
      )
      return false
    }
  }

  let linkedCount = 0
  const linkProductAtIndex = async (index: number): Promise<void> => {
    const product = products[index]
    if (product === undefined) {
      return
    }

    if (await linkProduct(product)) {
      linkedCount += 1
    }
    await linkProductAtIndex(index + 1)
  }

  await linkProductAtIndex(0)
  logger.info(`Successfully linked ${linkedCount} products to categories`)
  await logCategoryProductCounts(productService, categories, logger)
  logger.info("Finished linking products to categories!")
}
