import { asStorefrontNumber, asStorefrontRecord } from "./product-pricing"

type StorefrontRecord = Record<string, unknown>

const DEFAULT_STOCK_LOCATION_NAME = "Default stock"
const DEFAULT_STOCK_LOCATION_KEY = DEFAULT_STOCK_LOCATION_NAME.toLowerCase()

const asQuantity = (value: unknown): number | null => {
  const parsed = asStorefrontNumber(value)
  return parsed === null ? null : Math.max(0, Math.floor(parsed))
}

const resolveRawQuantity = (value: unknown): number | null => {
  const rawRecord = asStorefrontRecord(value)
  return asQuantity(rawRecord?.value)
}

const resolveLevelAvailableQuantity = (
  level: StorefrontRecord
): number | null => {
  const explicitAvailable = asQuantity(level.available_quantity)
  if (explicitAvailable !== null) {
    return explicitAvailable
  }

  const stockedQuantity =
    asQuantity(level.stocked_quantity) ??
    resolveRawQuantity(level.raw_stocked_quantity)
  const reservedQuantity =
    asQuantity(level.reserved_quantity) ??
    resolveRawQuantity(level.raw_reserved_quantity) ??
    0

  return stockedQuantity === null
    ? null
    : Math.max(0, stockedQuantity - reservedQuantity)
}

const hasDefaultStockLocation = (level: StorefrontRecord): boolean => {
  const stockLocations = level.stock_locations
  const locations = Array.isArray(stockLocations)
    ? stockLocations
    : [stockLocations]

  return locations.some((location) => {
    const locationRecord = asStorefrontRecord(location)
    return (
      typeof locationRecord?.name === "string" &&
      locationRecord.name.trim().toLowerCase() === DEFAULT_STOCK_LOCATION_KEY
    )
  })
}

const resolveInventoryItemDefaultStockQuantity = (
  inventoryItem: unknown
): number | null => {
  const inventoryItemRecord = asStorefrontRecord(inventoryItem)
  const inventory = asStorefrontRecord(inventoryItemRecord?.inventory)
  const locationLevels = Array.isArray(inventory?.location_levels)
    ? inventory.location_levels
    : []

  let hasDefaultStockLevel = false
  let availableQuantity = 0

  for (const level of locationLevels) {
    const levelRecord = asStorefrontRecord(level)
    if (!(levelRecord && hasDefaultStockLocation(levelRecord))) {
      continue
    }

    hasDefaultStockLevel = true
    availableQuantity += resolveLevelAvailableQuantity(levelRecord) ?? 0
  }

  if (!hasDefaultStockLevel) {
    return null
  }

  const requiredQuantity = Math.max(
    1,
    Math.floor(asStorefrontNumber(inventoryItemRecord?.required_quantity) ?? 1)
  )

  return Math.floor(availableQuantity / requiredQuantity)
}

export const resolveDefaultStockInventoryQuantity = (
  variant: unknown
): number | null => {
  const variantRecord = asStorefrontRecord(variant)
  const inventoryItems = Array.isArray(variantRecord?.inventory_items)
    ? variantRecord.inventory_items
    : null

  if (!inventoryItems) {
    return null
  }

  const quantities: number[] = []
  let hasUnknownInventoryItem = false

  for (const inventoryItem of inventoryItems) {
    const itemQuantity = resolveInventoryItemDefaultStockQuantity(inventoryItem)

    if (itemQuantity === null) {
      hasUnknownInventoryItem = true
      continue
    }

    quantities.push(itemQuantity)
  }

  if (quantities.some((quantity) => quantity === 0)) {
    return 0
  }

  if (hasUnknownInventoryItem) {
    return null
  }

  return quantities.length > 0 ? Math.min(...quantities) : null
}

export const hasDefaultStockInventoryQuantity = (variant: unknown) =>
  resolveDefaultStockInventoryQuantity(variant) !== null
