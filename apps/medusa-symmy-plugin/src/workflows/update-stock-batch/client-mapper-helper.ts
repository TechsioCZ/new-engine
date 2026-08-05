import type { StockUpdateInput, UpdateStockBatchResult } from "./types"

export interface ResolvedUpdate {
  index: number
  input: StockUpdateInput
  identifier: string
  inventoryItemId: string
  locationId: string
}

export interface ExistingLevel {
  id: string
  inventory_item_id: string
  location_id: string
  reserved_quantity: number
}

export interface LevelDTO {
  id?: string
  inventory_item_id?: string
  location_id?: string
  stocked_quantity?: number
  reserved_quantity?: number
  available_quantity?: number
}

export interface ResolverMaps {
  skuMap: Map<string, string>
  eanMap: Map<string, string>
  variantIdMap: Map<string, string>
  validInventoryItemIds: Set<string>
  defaultLocationId: string | null
}

export interface StockBatchPayload {
  create: Record<string, unknown>[]
  update: Record<string, unknown>[]
  createOwners: ResolvedUpdate[]
  updateOwners: ResolvedUpdate[]
}

interface StockIdentifierSets {
  skus: Set<string>
  eans: Set<string>
  variantIds: Set<string>
  inventoryItemIds: Set<string>
}

export type VariantInventoryItemRow = Record<string, unknown> & {
  inventory_items?: { inventory?: { id?: string } }[]
}

const levelKey = (inventoryItemId: string, locationId: string) =>
  `${inventoryItemId}:${locationId}`

export class StockBatchClientMapperHelper {
  collectIdentifiers(updates: StockUpdateInput[]): StockIdentifierSets {
    const skus = new Set<string>()
    const eans = new Set<string>()
    const variantIds = new Set<string>()
    const inventoryItemIds = new Set<string>()
    for (const update of updates) {
      if (update.identifier_type === "sku" && update.sku) {
        skus.add(update.sku)
      }
      if (update.identifier_type === "ean" && update.ean) {
        eans.add(update.ean)
      }
      if (update.identifier_type === "variant_id" && update.variant_id) {
        variantIds.add(update.variant_id)
      }
      if (
        update.identifier_type === "inventory_item_id" &&
        update.inventory_item_id
      ) {
        inventoryItemIds.add(update.inventory_item_id)
      }
    }
    return { eans, inventoryItemIds, skus, variantIds }
  }

  lookupInventoryItem(
    update: StockUpdateInput,
    maps: ResolverMaps,
  ): { identifier: string; inventoryItemId: string | undefined } {
    switch (update.identifier_type) {
      case "sku": {
        return {
          identifier: update.sku ?? "",
          inventoryItemId: maps.skuMap.get(update.sku ?? ""),
        }
      }
      case "ean": {
        return {
          identifier: update.ean ?? "",
          inventoryItemId: maps.eanMap.get(update.ean ?? ""),
        }
      }
      case "variant_id": {
        return {
          identifier: update.variant_id ?? "",
          inventoryItemId: maps.variantIdMap.get(update.variant_id ?? ""),
        }
      }
      case "inventory_item_id": {
        return {
          identifier: update.inventory_item_id ?? "",
          inventoryItemId: maps.validInventoryItemIds.has(
            update.inventory_item_id ?? "",
          )
            ? update.inventory_item_id
            : undefined,
        }
      }
      default: {
        return { identifier: "", inventoryItemId: undefined }
      }
    }
  }

  resolveUpdates(
    updates: StockUpdateInput[],
    maps: ResolverMaps,
    results: UpdateStockBatchResult[],
  ): ResolvedUpdate[] {
    const resolved: ResolvedUpdate[] = []
    for (const [index, update] of updates.entries()) {
      const { identifier, inventoryItemId } = this.lookupInventoryItem(
        update,
        maps,
      )
      if (!inventoryItemId) {
        results[index] = {
          error: `No inventory item found for ${update.identifier_type}=${identifier}`,
          identifier,
          identifier_type: update.identifier_type,
          status: "not_found",
        }
        continue
      }
      const locationId = update.location_id ?? maps.defaultLocationId
      if (!locationId) {
        results[index] = {
          error: "No location_id provided and no default stock location exists",
          identifier,
          identifier_type: update.identifier_type,
          inventory_item_id: inventoryItemId,
          status: "failed",
        }
        continue
      }
      resolved.push({
        identifier,
        index,
        input: update,
        inventoryItemId,
        locationId,
      })
    }
    return resolved
  }

  collectLevelLookupKeys(resolved: ResolvedUpdate[]) {
    return {
      inventoryItemIds: [
        ...new Set(resolved.map((item) => item.inventoryItemId)),
      ],
      locationIds: [...new Set(resolved.map((item) => item.locationId))],
    }
  }

  buildExistingLevelIndex(levels: ExistingLevel[]): Map<string, ExistingLevel> {
    const index = new Map<string, ExistingLevel>()
    for (const level of levels) {
      index.set(levelKey(level.inventory_item_id, level.location_id), level)
    }
    return index
  }

  buildVariantInventoryItemMap(
    field: "sku" | "ean" | "id",
    variants: VariantInventoryItemRow[],
  ): Map<string, string> {
    const index = new Map<string, string>()
    for (const variant of variants) {
      const value = variant[field]
      if (typeof value !== "string" || !value.length) {
        continue
      }
      const inventoryItemId = variant.inventory_items?.[0]?.inventory?.id
      if (inventoryItemId) {
        index.set(value, inventoryItemId)
      }
    }
    return index
  }

  buildValidInventoryItemIdSet(items: { id: string }[]): Set<string> {
    return new Set(items.map((item) => item.id))
  }

  buildBatchPayload(
    resolved: ResolvedUpdate[],
    existingLevels: Map<string, ExistingLevel>,
  ): StockBatchPayload {
    const create: Record<string, unknown>[] = []
    const update: Record<string, unknown>[] = []
    const createOwners: ResolvedUpdate[] = []
    const updateOwners: ResolvedUpdate[] = []

    for (const item of resolved) {
      const existing = existingLevels.get(
        levelKey(item.inventoryItemId, item.locationId),
      )
      const payload: Record<string, unknown> = {
        inventory_item_id: item.inventoryItemId,
        location_id: item.locationId,
        stocked_quantity: item.input.stocked_quantity,
      }
      if (typeof item.input.reserved_quantity === "number") {
        payload.reserved_quantity = item.input.reserved_quantity
      }
      if (existing) {
        payload.id = existing.id
        update.push(payload)
        updateOwners.push(item)
      } else {
        create.push(payload)
        createOwners.push(item)
      }
    }

    return { create, createOwners, update, updateOwners }
  }

  fillResultsFromLevels(
    owners: ResolvedUpdate[],
    levels: LevelDTO[],
    existingLevels: Map<string, ExistingLevel>,
    results: UpdateStockBatchResult[],
  ): void {
    for (const [i, owner] of owners.entries()) {
      const level = levels[i]
      if (!level) {
        results[owner.index] = {
          error: "Level not returned from batch workflow",
          identifier: owner.identifier,
          identifier_type: owner.input.identifier_type,
          inventory_item_id: owner.inventoryItemId,
          status: "failed",
        }
        continue
      }
      const stocked = level.stocked_quantity ?? owner.input.stocked_quantity
      const reserved =
        level.reserved_quantity ??
        owner.input.reserved_quantity ??
        existingLevels.get(levelKey(owner.inventoryItemId, owner.locationId))
          ?.reserved_quantity ??
        0
      const available =
        level.available_quantity ?? Math.max(stocked - reserved, 0)

      results[owner.index] = {
        available_quantity: available,
        identifier: owner.identifier,
        identifier_type: owner.input.identifier_type,
        inventory_item_id: owner.inventoryItemId,
        status: "updated",
        stocked_quantity: stocked,
      }
    }
  }
}

export const stockBatchClientMapperHelper = new StockBatchClientMapperHelper()
