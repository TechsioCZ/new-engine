import type {
  InventoryLevelDTO,
  StockLocationDTO,
} from "@medusajs/framework/types"

export type StockLocationRecord = Pick<StockLocationDTO, "id" | "name">

export type VariantInventoryItemLink = {
  inventory_item_id: string
  required_quantity: number
  variant_id: string
}

export type InventoryLevel = Pick<
  InventoryLevelDTO,
  "inventory_item_id" | "location_id" | "reserved_quantity" | "stocked_quantity"
> & {
  available_quantity?: number | null
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
  const availableByLocation = new Map<string, number>(
    stockLocations.map((location) => [location.id, 0] as const)
  )
  const allowedLocationIds = new Set(availableByLocation.keys())

  for (const level of levels) {
    if (!allowedLocationIds.has(level.location_id)) {
      continue
    }

    const availableQuantity =
      level.available_quantity ??
      Math.max(0, level.stocked_quantity - level.reserved_quantity)

    availableByLocation.set(
      level.location_id,
      (availableByLocation.get(level.location_id) ?? 0) + availableQuantity
    )
  }

  for (const location of stockLocations) {
    availableByLocation.set(
      location.id,
      Math.floor(
        (availableByLocation.get(location.id) ?? 0) / link.required_quantity
      )
    )
  }

  return availableByLocation
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
