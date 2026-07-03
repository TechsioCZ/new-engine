export type BusinessLocationCode = "store" | "makov_main_warehouse"

type BusinessLocation = {
  code: BusinessLocationCode
  name: string
  stockLocationNames: readonly string[]
}

export type VariantInventoryItemLink = {
  inventory_item_id: string
  required_quantity?: number | string | null
  variant_id: string
}

export type InventoryLevel = {
  available_quantity?: number | string | null
  inventory_item_id: string
  reserved_quantity?: number | string | null
  stock_locations?: unknown
  stocked_quantity?: number | string | null
}

export type LocationAvailability = {
  available_quantity: number
  location_code: BusinessLocationCode
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

export const BUSINESS_LOCATIONS = [
  {
    code: "store",
    name: "Prodejna",
    stockLocationNames: ["Pobočka Čadca"],
  },
  {
    code: "makov_main_warehouse",
    name: "Hlavní sklad Makov",
    stockLocationNames: ["Default stock", "European Warehouse"],
  },
] as const satisfies readonly BusinessLocation[]

const businessLocationCodeByStockLocationName = new Map<
  string,
  BusinessLocationCode
>(
  BUSINESS_LOCATIONS.flatMap((location) =>
    location.stockLocationNames.map((stockLocationName) => [
      normalizeStockLocationName(stockLocationName),
      location.code,
    ])
  )
)

export function buildProductLocationAvailability({
  inventoryItemLinks,
  inventoryLevels,
  productId,
  variantIds,
}: {
  inventoryItemLinks: VariantInventoryItemLink[]
  inventoryLevels: InventoryLevel[]
  productId: string
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
        levelsByInventoryItemId
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

function buildVariantLocationAvailability(
  links: VariantInventoryItemLink[],
  levelsByInventoryItemId: Map<string, InventoryLevel[]>
): LocationAvailability[] {
  const quantitiesByLocation = new Map(
    BUSINESS_LOCATIONS.map(
      (location) => [location.code, [] as number[]] as const
    )
  )

  for (const link of links) {
    const availableByLocation = buildAvailableQuantityByLocation(
      link,
      levelsByInventoryItemId.get(link.inventory_item_id) ?? []
    )

    for (const location of BUSINESS_LOCATIONS) {
      quantitiesByLocation
        .get(location.code)
        ?.push(availableByLocation.get(location.code) ?? 0)
    }
  }

  return BUSINESS_LOCATIONS.map((location) => {
    const quantities = quantitiesByLocation.get(location.code) ?? []

    return {
      available_quantity: quantities.length > 0 ? Math.min(...quantities) : 0,
      location_code: location.code,
      location_name: location.name,
    }
  })
}

function buildAvailableQuantityByLocation(
  link: VariantInventoryItemLink,
  levels: InventoryLevel[]
): Map<BusinessLocationCode, number> {
  const requiredQuantity = toRequiredQuantity(link.required_quantity)
  const availableByLocation = new Map<BusinessLocationCode, number>(
    BUSINESS_LOCATIONS.map((location) => [location.code, 0] as const)
  )

  for (const level of levels) {
    const availableQuantity = getLevelAvailableQuantity(level)

    if (availableQuantity === undefined) {
      continue
    }

    for (const locationCode of resolveBusinessLocationCodes(level)) {
      availableByLocation.set(
        locationCode,
        (availableByLocation.get(locationCode) ?? 0) + availableQuantity
      )
    }
  }

  for (const location of BUSINESS_LOCATIONS) {
    availableByLocation.set(
      location.code,
      Math.floor(
        (availableByLocation.get(location.code) ?? 0) / requiredQuantity
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

function resolveBusinessLocationCodes(
  level: InventoryLevel
): BusinessLocationCode[] {
  const codes = new Set<BusinessLocationCode>()

  for (const stockLocation of getStockLocationRecords(level.stock_locations)) {
    if (typeof stockLocation.name !== "string") {
      continue
    }

    const code = businessLocationCodeByStockLocationName.get(
      normalizeStockLocationName(stockLocation.name)
    )

    if (code) {
      codes.add(code)
    }
  }

  return [...codes]
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

function normalizeStockLocationName(value: string): string {
  return value.trim().toLocaleLowerCase("cs-CZ")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
