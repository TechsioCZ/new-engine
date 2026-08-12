import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import type {
  ProductDTO,
  ProductVariantDTO,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { normalizeProductSalesChannelFilter } from "../../../../utils/product-filters"
import {
  buildProductLocationAvailability,
  type InventoryLevel,
  type ProductLocationAvailability,
  type StockLocationRecord,
  type VariantInventoryItemLink,
} from "./availability"
import type { StoreProductLocationAvailabilityQuery } from "./middlewares"

const QUERY_FILTER_CHUNK_SIZE = 100

type QueryResult<T> = {
  data: T[]
}

type ProductRecord = Pick<ProductDTO, "id"> & {
  variants: Pick<ProductVariantDTO, "id">[]
}

type StockLocationLinkRecord = {
  stock_location_id: string
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

function asStringArray(
  value: StoreProductLocationAvailabilityQuery["sales_channel_id"]
): string[] {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

async function queryStockLocationsForSalesChannels(
  query: Query,
  salesChannelIds: string[]
): Promise<StockLocationRecord[]> {
  const stockLocationIds: string[] = []

  for (const salesChannelIdChunk of chunkValues(salesChannelIds)) {
    const { data: links }: QueryResult<StockLocationLinkRecord> =
      await query.graph({
        entity: "sales_channel_location",
        fields: ["stock_location_id"],
        filters: { sales_channel_id: salesChannelIdChunk },
      })

    for (const link of links) {
      stockLocationIds.push(link.stock_location_id)
    }
  }

  const uniqueStockLocationIds = Array.from(new Set(stockLocationIds))

  if (uniqueStockLocationIds.length === 0) {
    return []
  }

  const stockLocations: StockLocationRecord[] = []

  for (const stockLocationIdChunk of chunkValues(uniqueStockLocationIds)) {
    const { data: locations }: QueryResult<StockLocationRecord> =
      await query.graph({
        entity: "stock_location",
        fields: ["id", "name"],
        filters: { id: stockLocationIdChunk },
      })
    stockLocations.push(...locations)
  }

  const stockLocationById = new Map(
    stockLocations.map((stockLocation) => [stockLocation.id, stockLocation])
  )

  return uniqueStockLocationIds.flatMap((stockLocationId) => {
    const stockLocation = stockLocationById.get(stockLocationId)

    return stockLocation ? [stockLocation] : []
  })
}

export async function GET(
  req: MedusaStoreRequest<unknown, StoreProductLocationAvailabilityQuery>,
  res: MedusaResponse<ProductLocationAvailability>
) {
  const { id: productId } = req.params
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
  const { data: products }: QueryResult<ProductRecord> = await query.graph({
    entity: "product",
    fields: ["id", "variants.id"],
    filters: productFilters,
    pagination: { take: 1 },
  })
  const product = products[0]

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`
    )
  }

  const variantIds = product.variants.map((variant) => variant.id)

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
    const { data: links }: QueryResult<VariantInventoryItemLink> =
      await query.graph({
        entity: "product_variant_inventory_item",
        fields: ["variant_id", "inventory_item_id", "required_quantity"],
        filters: { variant_id: variantIdChunk },
      })
    inventoryItemLinks.push(...links)
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
    const { data: levels }: QueryResult<InventoryLevel> = await query.graph({
      entity: "inventory_level",
      fields: [
        "inventory_item_id",
        "location_id",
        "available_quantity",
        "stocked_quantity",
        "reserved_quantity",
      ],
      filters: {
        inventory_item_id: inventoryItemIdChunk,
        location_id: stockLocationIds,
      },
    })
    inventoryLevels.push(...levels)
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
