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

export interface CreateLevelPayload {
  inventory_item_id: string
  location_id: string
  reserved_quantity?: number
  stocked_quantity: number
}

export interface UpdateLevelPayload extends CreateLevelPayload {
  id: string
}

export interface StockBatchPayload {
  create: CreateLevelPayload[]
  update: UpdateLevelPayload[]
  createOwners: ResolvedUpdate[]
  updateOwners: ResolvedUpdate[]
}

interface StockIdentifierSets {
  skus: Set<string>
  eans: Set<string>
  variantIds: Set<string>
  inventoryItemIds: Set<string>
}

const levelKey = (inventoryItemId: string, locationId: string) =>
  `${inventoryItemId}:${locationId}`

const decodeExistingLevel = (value: unknown): ExistingLevel | null => {
  if (typeof value !== "object" || value === null) {
    return null
  }
  if (!("id" in value) || typeof value.id !== "string") {
    return null
  }
  if (
    !("inventory_item_id" in value) ||
    typeof value.inventory_item_id !== "string"
  ) {
    return null
  }
  if (!("location_id" in value) || typeof value.location_id !== "string") {
    return null
  }
  if (
    !("reserved_quantity" in value) ||
    typeof value.reserved_quantity !== "number"
  ) {
    return null
  }
  return {
    id: value.id,
    inventory_item_id: value.inventory_item_id,
    location_id: value.location_id,
    reserved_quantity: value.reserved_quantity,
  }
}

const decodeVariantInventoryItem = (
  value: unknown,
  field: "sku" | "ean" | "id",
): { id: string; key: string } | null => {
  if (typeof value !== "object" || value === null) {
    return null
  }
  let key: unknown
  switch (field) {
    case "sku": {
      key = "sku" in value ? value.sku : undefined
      break
    }
    case "ean": {
      key = "ean" in value ? value.ean : undefined
      break
    }
    case "id": {
      key = "id" in value ? value.id : undefined
      break
    }
    default: {
      return null
    }
  }
  if (typeof key !== "string" || key.length === 0) {
    return null
  }
  if (!("inventory_items" in value) || !Array.isArray(value.inventory_items)) {
    return null
  }
  const inventoryItem: unknown = value.inventory_items[0]
  if (
    typeof inventoryItem !== "object" ||
    inventoryItem === null ||
    !("inventory" in inventoryItem)
  ) {
    return null
  }
  const { inventory } = inventoryItem
  if (typeof inventory !== "object" || inventory === null) {
    return null
  }
  if (!("id" in inventory) || typeof inventory.id !== "string") {
    return null
  }
  return { id: inventory.id, key }
}

export const stockBatchClientMapperHelper = {
  buildBatchPayload(
    resolved: ResolvedUpdate[],
    existingLevels: Map<string, ExistingLevel>,
  ): StockBatchPayload {
    const create: CreateLevelPayload[] = []
    const update: UpdateLevelPayload[] = []
    const createOwners: ResolvedUpdate[] = []
    const updateOwners: ResolvedUpdate[] = []

    for (const item of resolved) {
      const existing = existingLevels.get(
        levelKey(item.inventoryItemId, item.locationId),
      )
      const payload: CreateLevelPayload = {
        inventory_item_id: item.inventoryItemId,
        location_id: item.locationId,
        stocked_quantity: item.input.stocked_quantity,
        ...(typeof item.input.reserved_quantity === "number"
          ? { reserved_quantity: item.input.reserved_quantity }
          : {}),
      }
      if (existing === undefined) {
        create.push(payload)
        createOwners.push(item)
      } else {
        update.push({ ...payload, id: existing.id })
        updateOwners.push(item)
      }
    }

    return { create, createOwners, update, updateOwners }
  },

  buildExistingLevelIndex(levels: unknown[]): Map<string, ExistingLevel> {
    const index = new Map<string, ExistingLevel>()
    for (const level of levels) {
      const decoded = decodeExistingLevel(level)
      if (decoded !== null) {
        index.set(
          levelKey(decoded.inventory_item_id, decoded.location_id),
          decoded,
        )
      }
    }
    return index
  },

  buildValidInventoryItemIdSet(items: unknown[]): Set<string> {
    const ids = new Set<string>()
    for (const item of items) {
      if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string"
      ) {
        ids.add(item.id)
      }
    }
    return ids
  },

  buildVariantInventoryItemMap(
    field: "sku" | "ean" | "id",
    variants: unknown[],
  ): Map<string, string> {
    const index = new Map<string, string>()
    for (const variant of variants) {
      const decoded = decodeVariantInventoryItem(variant, field)
      if (decoded !== null) {
        index.set(decoded.key, decoded.id)
      }
    }
    return index
  },

  collectIdentifiers(updates: StockUpdateInput[]): StockIdentifierSets {
    const skus = new Set<string>()
    const eans = new Set<string>()
    const variantIds = new Set<string>()
    const inventoryItemIds = new Set<string>()
    for (const update of updates) {
      if (update.identifier_type === "sku" && update.sku !== undefined) {
        skus.add(update.sku)
      }
      if (update.identifier_type === "ean" && update.ean !== undefined) {
        eans.add(update.ean)
      }
      if (
        update.identifier_type === "variant_id" &&
        update.variant_id !== undefined
      ) {
        variantIds.add(update.variant_id)
      }
      if (
        update.identifier_type === "inventory_item_id" &&
        update.inventory_item_id !== undefined
      ) {
        inventoryItemIds.add(update.inventory_item_id)
      }
    }
    return { eans, inventoryItemIds, skus, variantIds }
  },

  collectLevelLookupKeys(resolved: ResolvedUpdate[]) {
    return {
      inventoryItemIds: [
        ...new Set(resolved.map((item) => item.inventoryItemId)),
      ],
      locationIds: [...new Set(resolved.map((item) => item.locationId))],
    }
  },

  fillResultsFromLevels(
    owners: ResolvedUpdate[],
    levels: LevelDTO[],
    existingLevels: Map<string, ExistingLevel>,
    results: UpdateStockBatchResult[],
  ): void {
    for (const [i, owner] of owners.entries()) {
      const level = levels[i]
      if (level === undefined) {
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
  },

  lookupInventoryItem(
    update: StockUpdateInput,
    maps: ResolverMaps,
  ): { identifier: string; inventoryItemId: string | null } {
    switch (update.identifier_type) {
      case "sku": {
        return {
          identifier: update.sku ?? "",
          inventoryItemId: maps.skuMap.get(update.sku ?? "") ?? null,
        }
      }
      case "ean": {
        return {
          identifier: update.ean ?? "",
          inventoryItemId: maps.eanMap.get(update.ean ?? "") ?? null,
        }
      }
      case "variant_id": {
        return {
          identifier: update.variant_id ?? "",
          inventoryItemId:
            maps.variantIdMap.get(update.variant_id ?? "") ?? null,
        }
      }
      case "inventory_item_id": {
        const inventoryItemId = update.inventory_item_id
        return {
          identifier: inventoryItemId ?? "",
          inventoryItemId:
            inventoryItemId !== undefined &&
            maps.validInventoryItemIds.has(inventoryItemId)
              ? inventoryItemId
              : null,
        }
      }
      default: {
        return { identifier: "", inventoryItemId: null }
      }
    }
  },

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
      if (inventoryItemId === null) {
        results[index] = {
          error: `No inventory item found for ${update.identifier_type}=${identifier}`,
          identifier,
          identifier_type: update.identifier_type,
          status: "not_found",
        }
        continue
      }
      const locationId = update.location_id ?? maps.defaultLocationId
      if (locationId === null) {
        results[index] = {
          error: "No location_id provided and no default stock location exists",
          identifier,
          identifier_type: update.identifier_type,
          inventory_item_id: inventoryItemId,
          status: "failed",
        }
      } else {
        resolved.push({
          identifier,
          index,
          input: update,
          inventoryItemId,
          locationId,
        })
      }
    }
    return resolved
  },
}
