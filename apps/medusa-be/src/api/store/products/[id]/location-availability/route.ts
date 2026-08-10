import type { Query } from "@medusajs/framework"
import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import type { ProductDTO, ProductVariantDTO } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { normalizeProductSalesChannelFilter } from "../../../../utils/product-filters"
import { buildProductLocationAvailability } from "./availability"
import type {
  InventoryLevel,
  ProductLocationAvailability,
  StockLocationRecord,
  VariantInventoryItemLink,
} from "./availability"
import type { StoreProductLocationAvailabilityQuery } from "./middlewares"

const QUERY_FILTER_CHUNK_SIZE = 100

interface QueryResult<T> {
  data: T[]
}

type ProductRecord = Pick<ProductDTO, "id"> & {
  variants: Pick<ProductVariantDTO, "id">[]
}

interface StockLocationLinkRecord {
  stock_location_id: string
}

const chunkValues = <TValue>(
  values: TValue[],
  size = QUERY_FILTER_CHUNK_SIZE,
) => {
  const chunks: TValue[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

const asStringArray = (
  value: StoreProductLocationAvailabilityQuery["sales_channel_id"],
): string[] => {
  if (value === undefined || value === null || value === "") {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

const queryStockLocationsForSalesChannels = async (
  query: Query,
  salesChannelIds: string[],
): Promise<StockLocationRecord[]> => {
  const linkResults = await Promise.all(
    chunkValues(salesChannelIds).map(async (salesChannelIdChunk) => {
      const { data }: QueryResult<StockLocationLinkRecord> = await query.graph({
        entity: "sales_channel_location",
        fields: ["stock_location_id"],
        filters: { sales_channel_id: salesChannelIdChunk },
      })
      return data
    }),
  )
  const stockLocationIds = linkResults
    .flat()
    .map((link) => link.stock_location_id)

  const uniqueStockLocationIds = [...new Set(stockLocationIds)]

  if (uniqueStockLocationIds.length === 0) {
    return []
  }

  const stockLocationResults = await Promise.all(
    chunkValues(uniqueStockLocationIds).map(async (stockLocationIdChunk) => {
      const { data }: QueryResult<StockLocationRecord> = await query.graph({
        entity: "stock_location",
        fields: ["id", "name"],
        filters: { id: stockLocationIdChunk },
      })
      return data
    }),
  )
  const stockLocations = stockLocationResults.flat()

  const stockLocationById = new Map(
    stockLocations.map((stockLocation) => [stockLocation.id, stockLocation]),
  )

  return uniqueStockLocationIds.flatMap((stockLocationId) => {
    const stockLocation = stockLocationById.get(stockLocationId)

    return stockLocation === undefined ? [] : [stockLocation]
  })
}

const getProductLocationAvailability = async (
  req: MedusaStoreRequest<unknown, StoreProductLocationAvailabilityQuery>,
  res: MedusaResponse<ProductLocationAvailability>,
) => {
  const { id: productId } = req.params
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const salesChannelIds = asStringArray(req.filterableFields?.sales_channel_id)
  const productFilters = await normalizeProductSalesChannelFilter(remoteQuery, {
    ...req.filterableFields,
    ...(productId === undefined ? {} : { id: productId }),
  })
  const { data: products }: QueryResult<ProductRecord> = await query.graph({
    entity: "product",
    fields: ["id", "variants.id"],
    filters: productFilters,
    pagination: { take: 1 },
  })
  const [product] = products

  if (product === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`,
    )
  }

  const variantIds = product.variants.map((variant) => variant.id)

  const stockLocations = await queryStockLocationsForSalesChannels(
    query,
    salesChannelIds,
  )

  if (variantIds.length === 0) {
    res.json({
      product_id: product.id,
      variants: [],
    })
    return
  }

  const inventoryItemLinkResults = await Promise.all(
    chunkValues(variantIds).map(async (variantIdChunk) => {
      const { data }: QueryResult<VariantInventoryItemLink> = await query.graph(
        {
          entity: "product_variant_inventory_item",
          fields: ["variant_id", "inventory_item_id", "required_quantity"],
          filters: { variant_id: variantIdChunk },
        },
      )
      return data
    }),
  )
  const inventoryItemLinks = inventoryItemLinkResults.flat()

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
      }),
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
      }),
    )
    return
  }

  const stockLocationIds = stockLocations.map(
    (stockLocation) => stockLocation.id,
  )

  const inventoryLevelResults = await Promise.all(
    chunkValues(inventoryItemIds).map(async (inventoryItemIdChunk) => {
      const { data }: QueryResult<InventoryLevel> = await query.graph({
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
      return data
    }),
  )
  const inventoryLevels = inventoryLevelResults.flat()

  res.json(
    buildProductLocationAvailability({
      inventoryItemLinks,
      inventoryLevels,
      productId: product.id,
      stockLocations,
      variantIds,
    }),
  )
}

export { getProductLocationAvailability as GET }
