export type StockLocationRecord = {
  id: string
  name: string
}

export type VariantInventoryItemLink = {
  inventory_item_id: string
  required_quantity?: number | string | null
  variant_id: string
}

export type InventoryLevel = {
  available_quantity?: number | string | null
  inventory_item_id: string
  location_id?: string | null
  reserved_quantity?: number | string | null
  stock_locations?: unknown
  stocked_quantity?: number | string | null
}

export type LocationAvailability = {
  available_quantity: number
  location_id: string
  location_name: string
}

export type VariantLocationAvailability = {
  location_availability: LocationAvailability[]
  variant_id: string
}

export type ProductLocationAvailability = {
  product_id: string
  variants: VariantLocationAvailability[]
}

export function buildProductLocationAvailability({
  inventoryItemLinks,
  inventoryLevels,
  productId,
  stockLocations,
  variantIds,
}: {
  inventoryItemLinks: VariantInventoryItemLink[]
  inventoryLevels: InventoryLevel[]
  productId: string
  stockLocations: StockLocationRecord[]
  variantIds: string[]
}): ProductLocationAvailability {
  const levelsByInventoryItemId = groupBy(
    inventoryLevels,
    (level) => level.inventory_item_id
  )
  const linksByVariantId = groupBy(
    inventoryItemLinks,
    (link) => link.variant_id
  )

  return {
    product_id: productId,
    variants: variantIds.map((variantId) => ({
      location_availability: buildVariantLocationAvailability(
        linksByVariantId.get(variantId) ?? [],
        levelsByInventoryItemId,
        stockLocations
      ),
      variant_id: variantId,
    })),
  }
}

export function isVariantInventoryItemLink(
  value: unknown
): value is VariantInventoryItemLink {
  return (
    isRecord(value) &&
    typeof value.variant_id === "string" &&
    typeof value.inventory_item_id === "string"
  )
}

export function isInventoryLevel(value: unknown): value is InventoryLevel {
  return isRecord(value) && typeof value.inventory_item_id === "string"
}

export function isStockLocationRecord(
  value: unknown
): value is StockLocationRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  )
}

function buildVariantLocationAvailability(
  links: VariantInventoryItemLink[],
  levelsByInventoryItemId: Map<string, InventoryLevel[]>,
  stockLocations: StockLocationRecord[]
): LocationAvailability[] {
  const quantitiesByLocation = new Map(
    stockLocations.map((location) => [location.id, [] as number[]] as const)
  )

  for (const link of links) {
    const availableByLocation = buildAvailableQuantityByLocation(
      link,
      levelsByInventoryItemId.get(link.inventory_item_id) ?? [],
      stockLocations
    )

    for (const location of stockLocations) {
      quantitiesByLocation
        .get(location.id)
        ?.push(availableByLocation.get(location.id) ?? 0)
    }
  }

  return stockLocations.map((location) => {
    const quantities = quantitiesByLocation.get(location.id) ?? []

    return {
      available_quantity: quantities.length > 0 ? Math.min(...quantities) : 0,
      location_id: location.id,
      location_name: location.name,
    }
  })
}

function buildAvailableQuantityByLocation(
  link: VariantInventoryItemLink,
  levels: InventoryLevel[],
  stockLocations: StockLocationRecord[]
): Map<string, number> {
  const requiredQuantity = toRequiredQuantity(link.required_quantity)
  const availableByLocation = new Map<string, number>(
    stockLocations.map((location) => [location.id, 0] as const)
  )
  const allowedLocationIds = new Set(availableByLocation.keys())

  for (const level of levels) {
    const availableQuantity = getLevelAvailableQuantity(level)

    if (availableQuantity === undefined) {
      continue
    }

    for (const locationId of resolveStockLocationIds(level)) {
      if (!allowedLocationIds.has(locationId)) {
        continue
      }

      availableByLocation.set(
        locationId,
        (availableByLocation.get(locationId) ?? 0) + availableQuantity
      )
    }
  }

  for (const location of stockLocations) {
    availableByLocation.set(
      location.id,
      Math.floor(
        (availableByLocation.get(location.id) ?? 0) / requiredQuantity
      )
    )
  }

  return availableByLocation
}

function getLevelAvailableQuantity(level: InventoryLevel): number | undefined {
  const availableQuantity = toNonNegativeNumber(level.available_quantity)

  if (availableQuantity !== undefined) {
    return availableQuantity
  }

  const stockedQuantity = toNonNegativeNumber(level.stocked_quantity)

  if (stockedQuantity === undefined) {
    return
  }

  const reservedQuantity = toNonNegativeNumber(level.reserved_quantity) ?? 0

  return Math.max(0, stockedQuantity - reservedQuantity)
}

function resolveStockLocationIds(level: InventoryLevel): string[] {
  const locationIds = new Set<string>()

  if (typeof level.location_id === "string") {
    locationIds.add(level.location_id)
  }

  for (const stockLocation of getStockLocationRecords(level.stock_locations)) {
    if (typeof stockLocation.id === "string") {
      locationIds.add(stockLocation.id)
    }
  }

  return [...locationIds]
}

function getStockLocationRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord)
  }

  return isRecord(value) ? [value] : []
}

function groupBy<T>(
  values: T[],
  getKey: (value: T) => string
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  for (const value of values) {
    const key = getKey(value)
    const group = grouped.get(key)

    if (group) {
      group.push(value)
    } else {
      grouped.set(key, [value])
    }
  }

  return grouped
}

function toRequiredQuantity(value: unknown): number {
  const quantity = toNonNegativeNumber(value)

  return quantity && quantity > 0 ? quantity : 1
}

function toNonNegativeNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return
  }

  let numericValue = Number.NaN

  if (typeof value === "number") {
    numericValue = value
  } else if (typeof value === "string") {
    numericValue = Number(value)
  }

  if (!Number.isFinite(numericValue)) {
    return
  }

  return Math.max(0, Math.floor(numericValue))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
