import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { batchInventoryItemLevelsWorkflow } from "@medusajs/medusa/core-flows"
import {
  type ExistingLevel,
  type LevelDTO,
  type ResolvedUpdate,
  type ResolverMaps,
  type StockBatchPayload,
  stockBatchClientMapperHelper,
  type VariantInventoryItemRow,
} from "./client-mapper-helper"
import type { UpdateStockBatchInput } from "./types"

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

export type BatchApplyResult = {
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
      skuMap,
      eanMap,
      variantIdMap,
      validInventoryItemIds,
      defaultLocationId,
    }
  }

  async loadExistingLevels(
    resolved: ResolvedUpdate[]
  ): Promise<Map<string, ExistingLevel>> {
    const { inventoryItemIds, locationIds } =
      this.mapper.collectLevelLookupKeys(resolved)
    if (!(inventoryItemIds.length && locationIds.length)) {
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
    return this.mapper.buildExistingLevelIndex(
      (levels ?? []) as ExistingLevel[]
    )
  }

  async applyBatch(payload: StockBatchPayload): Promise<BatchApplyResult> {
    if (!(payload.create.length || payload.update.length)) {
      return { created: [], updated: [] }
    }
    const { result } = await batchInventoryItemLevelsWorkflow(
      this.container
    ).run({
      input: {
        create: payload.create as never,
        update: payload.update as never,
      },
    })
    return {
      created: (result?.created ?? []) as LevelDTO[],
      updated: (result?.updated ?? []) as LevelDTO[],
    }
  }

  private async queryVariantsToInventoryItems(
    field: "sku" | "ean" | "id",
    values: Set<string>
  ): Promise<Map<string, string>> {
    if (!values.size) {
      return new Map()
    }
    const { data: variants } = await this.query.graph({
      entity: "variant",
      fields: [field, "inventory_items.inventory.id"],
      filters: { [field]: Array.from(values) },
    })
    return this.mapper.buildVariantInventoryItemMap(
      field,
      (variants ?? []) as VariantInventoryItemRow[]
    )
  }

  private async queryValidInventoryItemIds(
    ids: Set<string>
  ): Promise<Set<string>> {
    if (!ids.size) {
      return new Set()
    }
    const { data: items } = await this.query.graph({
      entity: "inventory_item",
      fields: ["id"],
      filters: { id: Array.from(ids) },
    })
    return this.mapper.buildValidInventoryItemIdSet(
      (items ?? []) as { id: string }[]
    )
  }

  private async resolveDefaultLocationId(): Promise<string | null> {
    const { data: locations } = await this.query.graph({
      entity: "stock_location",
      fields: ["id"],
      pagination: { take: 1 },
    })
    return locations?.[0]?.id ?? null
  }
}
