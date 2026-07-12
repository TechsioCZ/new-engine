import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { normalizeProductSalesChannelFilter } from "../../../../utils/product-filters"
import {
  buildProductLocationAvailability,
  type InventoryLevel,
  isInventoryLevel,
  isStockLocationRecord,
  isVariantInventoryItemLink,
  type StockLocationRecord,
  type VariantInventoryItemLink,
} from "./availability"

type ProductRecord = {
  id: string
  variants?: Array<{
    id?: string
  }>
}

const QUERY_FILTER_CHUNK_SIZE = 100

type StockLocationLinkRecord = {
  stock_location_id: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isProductRecord(value: unknown): value is ProductRecord {
  return isRecord(value) && typeof value.id === "string"
}

function isStockLocationLinkRecord(
  value: unknown
): value is StockLocationLinkRecord {
  return isRecord(value) && typeof value.stock_location_id === "string"
}

const chunkValues = <TValue>(
  values: TValue[],
  size = QUERY_FILTER_CHUNK_SIZE
) => {
  const chunks: TValue[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string")
  }

  return typeof value === "string" ? [value] : []
}

async function queryStockLocationsForSalesChannels(
  query: Query,
  salesChannelIds: string[]
): Promise<StockLocationRecord[]> {
  const stockLocationIds: string[] = []

  for (const salesChannelIdChunk of chunkValues(salesChannelIds)) {
    const linkResult = await query.graph({
      entity: "sales_channel_location",
      fields: ["stock_location_id"],
      filters: { sales_channel_id: salesChannelIdChunk },
    })
    const rawLinks: unknown[] = Array.isArray(linkResult.data)
      ? linkResult.data
      : []

    for (const linkRecord of rawLinks.filter(isStockLocationLinkRecord)) {
      stockLocationIds.push(linkRecord.stock_location_id)
    }
  }

  const uniqueStockLocationIds = Array.from(new Set(stockLocationIds))

  if (uniqueStockLocationIds.length === 0) {
    return []
  }

  const stockLocations: StockLocationRecord[] = []

  for (const stockLocationIdChunk of chunkValues(uniqueStockLocationIds)) {
    const stockLocationResult = await query.graph({
      entity: "stock_location",
      fields: ["id", "name"],
      filters: { id: stockLocationIdChunk },
    })
    const rawStockLocations: unknown[] = Array.isArray(stockLocationResult.data)
      ? stockLocationResult.data
      : []
    stockLocations.push(...rawStockLocations.filter(isStockLocationRecord))
  }

  const stockLocationById = new Map(
    stockLocations.map((stockLocation) => [stockLocation.id, stockLocation])
  )

  return uniqueStockLocationIds.flatMap((stockLocationId) => {
    const stockLocation = stockLocationById.get(stockLocationId)

    return stockLocation ? [stockLocation] : []
  })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId =
    typeof req.params.id === "string" ? req.params.id : undefined

  if (!productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product id is required"
    )
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const salesChannelIds = asStringArray(req.filterableFields?.sales_channel_id)
  const productFilters = await normalizeProductSalesChannelFilter(
    query,
    remoteQuery,
    {
      ...(req.filterableFields ?? {}),
      id: productId,
    }
  )
  const productResult = await query.graph({
    entity: "product",
    fields: ["id", "variants.id"],
    filters: productFilters,
    pagination: { take: 1 },
  })
  const products: unknown[] = Array.isArray(productResult.data)
    ? productResult.data
    : []
  const product = products.find(isProductRecord)

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`
    )
  }

  const variantIds = (product.variants ?? [])
    .map((variant) => variant.id)
    .filter((variantId): variantId is string => Boolean(variantId))

  const stockLocations = await queryStockLocationsForSalesChannels(
    query,
    salesChannelIds
  )

  if (variantIds.length === 0) {
    res.json({
      product_id: product.id,
      variants: [],
    })
    return
  }

  const inventoryItemLinks: VariantInventoryItemLink[] = []

  for (const variantIdChunk of chunkValues(variantIds)) {
    const linkResult = await query.graph({
      entity: "product_variant_inventory_item",
      fields: ["variant_id", "inventory_item_id", "required_quantity"],
      filters: { variant_id: variantIdChunk },
    })
    const rawLinks: unknown[] = Array.isArray(linkResult.data)
      ? linkResult.data
      : []
    inventoryItemLinks.push(...rawLinks.filter(isVariantInventoryItemLink))
  }

  const inventoryItemIds = [
    ...new Set(inventoryItemLinks.map((link) => link.inventory_item_id)),
  ]

  if (inventoryItemIds.length === 0) {
    res.json(
      buildProductLocationAvailability({
        inventoryItemLinks: [],
        inventoryLevels: [],
        productId: product.id,
        stockLocations,
        variantIds,
      })
    )
    return
  }

  if (stockLocations.length === 0) {
    res.json(
      buildProductLocationAvailability({
        inventoryItemLinks,
        inventoryLevels: [],
        productId: product.id,
        stockLocations,
        variantIds,
      })
    )
    return
  }

  const inventoryLevels: InventoryLevel[] = []
  const stockLocationIds = stockLocations.map(
    (stockLocation) => stockLocation.id
  )

  for (const inventoryItemIdChunk of chunkValues(inventoryItemIds)) {
    const levelResult = await query.graph({
      entity: "inventory_level",
      fields: [
        "inventory_item_id",
        "location_id",
        "available_quantity",
        "stocked_quantity",
        "reserved_quantity",
        "stock_locations.id",
      ],
      filters: {
        inventory_item_id: inventoryItemIdChunk,
        location_id: stockLocationIds,
      },
    })
    const rawLevels: unknown[] = Array.isArray(levelResult.data)
      ? levelResult.data
      : []
    inventoryLevels.push(...rawLevels.filter(isInventoryLevel))
  }

  res.json(
    buildProductLocationAvailability({
      inventoryItemLinks,
      inventoryLevels,
      productId: product.id,
      stockLocations,
      variantIds,
    })
  )
}
