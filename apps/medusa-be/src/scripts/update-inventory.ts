import type {
  ExecArgs,
  Logger,
  ProductDTO,
  StockLocationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows"

const PRODUCT_HANDLE = "blue-denim-jeans"
const STOCK_LOCATION_NAME = "European Warehouse"
const TARGET_STOCK_QUANTITY = 50

type ProductWithVariants = ProductDTO & {
  variants: NonNullable<ProductDTO["variants"]>
}

type ProductService = {
  listProducts: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProductDTO[]>
}

type StockLocationService = {
  listStockLocations: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<StockLocationDTO[]>
}

type InventoryItemLink = {
  inventory_item_id: string
  variant_id: string
}

type InventoryLevel = {
  id: string
  inventory_item_id: string
  location_id: string
  reserved_quantity: number
  stocked_quantity: number
}

type InventoryLevelUpdate = {
  id: string
  inventory_item_id: string
  location_id: string
  stocked_quantity: number
}

type QueryService = {
  graph: <T>(config: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data?: T[] }>
}

async function findProductWithVariants(
  productService: ProductService,
  logger: Logger
): Promise<ProductWithVariants | undefined> {
  logger.info(`Looking for product with handle: ${PRODUCT_HANDLE}`)

  const products = await productService.listProducts(
    {
      handle: PRODUCT_HANDLE,
    },
    {
      relations: ["variants", "variants.inventory_items"],
    }
  )

  const product = products[0]
  if (!product) {
    logger.error(`Product with handle "${PRODUCT_HANDLE}" not found`)
    return
  }

  logger.info(`Found product: ${product.title} (${product.id})`)

  if (!product.variants?.length) {
    logger.error(`Product "${product.title}" has no variants`)
    return
  }

  return product as ProductWithVariants
}

async function findStockLocation(
  stockLocationService: StockLocationService,
  logger: Logger
): Promise<StockLocationDTO | undefined> {
  const stockLocations = await stockLocationService.listStockLocations(
    {
      name: STOCK_LOCATION_NAME,
    },
    { take: 1 }
  )

  const stockLocation = stockLocations[0]
  if (!stockLocation) {
    logger.error(`Stock location "${STOCK_LOCATION_NAME}" not found`)
    return
  }

  logger.info(
    `Using stock location: ${stockLocation.name} (${stockLocation.id})`
  )

  return stockLocation
}

async function fetchInventoryItemLinks(
  query: QueryService,
  product: ProductWithVariants,
  logger: Logger
): Promise<InventoryItemLink[] | undefined> {
  const { data: inventoryItemLinks } = await query.graph<InventoryItemLink>({
    entity: "product_variant_inventory_item",
    fields: ["variant_id", "inventory_item_id"],
    filters: {
      variant_id: product.variants.map((variant) => variant.id),
    },
  })

  if (!inventoryItemLinks?.length) {
    logger.error("No inventory items found for product variants")
    return
  }

  return inventoryItemLinks
}

async function fetchInventoryLevels(
  query: QueryService,
  inventoryItemLinks: InventoryItemLink[],
  stockLocation: StockLocationDTO,
  logger: Logger
): Promise<InventoryLevel[] | undefined> {
  const inventoryItemIds = inventoryItemLinks.map(
    (link) => link.inventory_item_id
  )
  const { data: inventoryLevels } = await query.graph<InventoryLevel>({
    entity: "inventory_level",
    fields: [
      "id",
      "inventory_item_id",
      "location_id",
      "stocked_quantity",
      "reserved_quantity",
    ],
    filters: {
      inventory_item_id: inventoryItemIds,
      location_id: stockLocation.id,
    },
  })

  if (!inventoryLevels?.length) {
    logger.error("No inventory levels found for the given location")
    return
  }

  logger.info(`Found ${inventoryLevels.length} inventory levels to update`)
  return inventoryLevels
}

function buildInventoryLevelUpdates({
  inventoryItemLinks,
  inventoryLevels,
  logger,
  product,
}: {
  inventoryItemLinks: InventoryItemLink[]
  inventoryLevels: InventoryLevel[]
  logger: Logger
  product: ProductWithVariants
}): InventoryLevelUpdate[] {
  const updates: InventoryLevelUpdate[] = []

  for (const level of inventoryLevels) {
    const link = inventoryItemLinks.find(
      (candidate) => candidate.inventory_item_id === level.inventory_item_id
    )
    const variant = product.variants.find(
      (candidate) => candidate.id === link?.variant_id
    )

    if (!variant) {
      continue
    }

    logger.info(
      `Checking inventory for variant: ${variant.title} (${variant.sku})`
    )
    logger.info(
      `Current stock: ${level.stocked_quantity}, Reserved: ${level.reserved_quantity}`
    )

    if (level.stocked_quantity === TARGET_STOCK_QUANTITY) {
      logger.info(
        `Skipping update - stock quantity already at target: ${TARGET_STOCK_QUANTITY}`
      )
      continue
    }

    updates.push({
      id: level.id,
      inventory_item_id: level.inventory_item_id,
      location_id: level.location_id,
      stocked_quantity: TARGET_STOCK_QUANTITY,
    })

    logger.info(`Will update stock quantity to: ${TARGET_STOCK_QUANTITY}`)
  }

  return updates
}

export default async function updateInventory({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve<ProductService>(Modules.PRODUCT)
  const stockLocationService = container.resolve<StockLocationService>(
    Modules.STOCK_LOCATION
  )
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)

  try {
    const product = await findProductWithVariants(productService, logger)
    const stockLocation = await findStockLocation(stockLocationService, logger)
    if (!(product && stockLocation)) {
      return
    }

    const inventoryItemLinks = await fetchInventoryItemLinks(
      query,
      product,
      logger
    )
    if (!inventoryItemLinks) {
      return
    }

    const inventoryLevels = await fetchInventoryLevels(
      query,
      inventoryItemLinks,
      stockLocation,
      logger
    )
    if (!inventoryLevels) {
      return
    }

    const updates = buildInventoryLevelUpdates({
      inventoryItemLinks,
      inventoryLevels,
      logger,
      product,
    })
    if (updates.length === 0) {
      logger.warn("No inventory levels to update")
      return
    }

    await updateInventoryLevelsWorkflow(container).run({
      input: {
        updates,
      },
    })

    logger.info(`Successfully updated ${updates.length} inventory levels`)
    logger.info("Inventory update completed!")
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Error updating inventory:", err)
    throw err
  }
}
