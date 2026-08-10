import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { batchInventoryItemLevelsWorkflow } from "@medusajs/medusa/core-flows"

import { stockBatchClientMapperHelper } from "./client-mapper-helper"
import type {
  ExistingLevel,
  LevelDTO,
  ResolvedUpdate,
  ResolverMaps,
  StockBatchPayload,
} from "./client-mapper-helper"
import type { UpdateStockBatchInput } from "./types"

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

export interface BatchApplyResult {
  created: LevelDTO[]
  updated: LevelDTO[]
}

export class StockBatchClient {
  private readonly container: MedusaContainer
  private readonly mapper = stockBatchClientMapperHelper
  private readonly query: Query

  constructor(container: MedusaContainer) {
    this.container = container
    this.query = getQuery(container)
  }

  async preload(input: UpdateStockBatchInput): Promise<ResolverMaps> {
    const { skus, eans, variantIds, inventoryItemIds } =
      this.mapper.collectIdentifiers(input.updates)

    const [
      skuMap,
      eanMap,
      variantIdMap,
      validInventoryItemIds,
      defaultLocationId,
    ] = await Promise.all([
      this.queryVariantsToInventoryItems("sku", skus),
      this.queryVariantsToInventoryItems("ean", eans),
      this.queryVariantsToInventoryItems("id", variantIds),
      this.queryValidInventoryItemIds(inventoryItemIds),
      this.resolveDefaultLocationId(),
    ])

    return {
      defaultLocationId,
      eanMap,
      skuMap,
      validInventoryItemIds,
      variantIdMap,
    }
  }

  async loadExistingLevels(
    resolved: ResolvedUpdate[],
  ): Promise<Map<string, ExistingLevel>> {
    const { inventoryItemIds, locationIds } =
      this.mapper.collectLevelLookupKeys(resolved)
    if (inventoryItemIds.length === 0 || locationIds.length === 0) {
      return new Map()
    }
    const { data: levels } = await this.query.graph({
      entity: "inventory_level",
      fields: ["id", "inventory_item_id", "location_id", "reserved_quantity"],
      filters: {
        inventory_item_id: inventoryItemIds,
        location_id: locationIds,
      },
    })
    return this.mapper.buildExistingLevelIndex(levels ?? [])
  }

  async applyBatch(payload: StockBatchPayload): Promise<BatchApplyResult> {
    if (payload.create.length === 0 && payload.update.length === 0) {
      return { created: [], updated: [] }
    }
    const { result } = await batchInventoryItemLevelsWorkflow(
      this.container,
    ).run({
      input: {
        create: payload.create,
        update: payload.update,
      },
    })
    return {
      created: result?.created ?? [],
      updated: result?.updated ?? [],
    }
  }

  private async queryVariantsToInventoryItems(
    field: "sku" | "ean" | "id",
    values: Set<string>,
  ): Promise<Map<string, string>> {
    if (values.size === 0) {
      return new Map()
    }
    const { data: variants } = await this.query.graph({
      entity: "variant",
      fields: [field, "inventory_items.inventory.id"],
      filters: { [field]: [...values] },
    })
    return this.mapper.buildVariantInventoryItemMap(field, variants ?? [])
  }

  private async queryValidInventoryItemIds(
    ids: Set<string>,
  ): Promise<Set<string>> {
    if (ids.size === 0) {
      return new Set()
    }
    const { data: items } = await this.query.graph({
      entity: "inventory_item",
      fields: ["id"],
      filters: { id: [...ids] },
    })
    return this.mapper.buildValidInventoryItemIdSet(items ?? [])
  }

  private async resolveDefaultLocationId(): Promise<string | null> {
    const { data: locations } = await this.query.graph({
      entity: "stock_location",
      fields: ["id"],
      pagination: { take: 1 },
    })
    const location: unknown = locations[0]
    if (typeof location !== "object" || location === null) {
      return null
    }
    if (!("id" in location) || typeof location.id !== "string") {
      return null
    }
    return location.id
  }
}
