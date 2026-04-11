export type VariantAvailabilityInput = {
  allow_backorder?: boolean | null
  manage_inventory?: boolean | null
  inventory_quantity?: number | null
}

export type ProductAvailabilityStatus =
  | "in-stock"
  | "limited-stock"
  | "out-of-stock"

export type ProductAvailabilityLabel =
  | "Skladem"
  | "Na objednávku"
  | "Vyprodáno"

export type VariantAvailability = {
  isPurchasable: boolean
  status: ProductAvailabilityStatus
  label: ProductAvailabilityLabel
  availableQuantity: number | null
}

const DEFAULT_MAX_ORDER_QUANTITY = 99 as const

const normalizeQuantity = (quantity?: number | null) =>
  typeof quantity === "number" && Number.isFinite(quantity)
    ? Math.max(quantity, 0)
    : 0

export const resolveVariantAvailability = (
  variant?: VariantAvailabilityInput | null
): VariantAvailability => {
  if (!variant) {
    return {
      isPurchasable: false,
      status: "out-of-stock",
      label: "Vyprodáno",
      availableQuantity: 0,
    }
  }

  const inventoryQuantity = normalizeQuantity(variant.inventory_quantity)
  const managesInventory = variant.manage_inventory !== false
  const allowsBackorder = variant.allow_backorder === true

  if (!managesInventory) {
    return {
      isPurchasable: true,
      status: "in-stock",
      label: "Skladem",
      availableQuantity: null,
    }
  }

  if (inventoryQuantity > 0) {
    return {
      isPurchasable: true,
      status: "in-stock",
      label: "Skladem",
      availableQuantity: inventoryQuantity,
    }
  }

  if (allowsBackorder) {
    return {
      isPurchasable: true,
      status: "limited-stock",
      label: "Na objednávku",
      availableQuantity: null,
    }
  }

  return {
    isPurchasable: false,
    status: "out-of-stock",
    label: "Vyprodáno",
    availableQuantity: 0,
  }
}

export const isVariantPurchasable = (
  variant?: VariantAvailabilityInput | null
) => resolveVariantAvailability(variant).isPurchasable

export const getVariantMaxOrderQuantity = (
  variant?: VariantAvailabilityInput | null
) => {
  const availability = resolveVariantAvailability(variant)

  if (availability.availableQuantity != null) {
    return Math.max(availability.availableQuantity, 1)
  }

  return availability.isPurchasable ? DEFAULT_MAX_ORDER_QUANTITY : 1
}

export const resolveProductAvailability = (
  variants?: VariantAvailabilityInput[] | null
) => {
  if (!variants?.length) {
    return {
      status: "out-of-stock" as const,
      label: "Vyprodáno" as const,
    }
  }

  const resolved = variants.map((variant) => resolveVariantAvailability(variant))

  if (resolved.some((availability) => availability.status === "in-stock")) {
    return {
      status: "in-stock" as const,
      label: "Skladem" as const,
    }
  }

  if (resolved.some((availability) => availability.isPurchasable)) {
    return {
      status: "limited-stock" as const,
      label: "Na objednávku" as const,
    }
  }

  return {
    status: "out-of-stock" as const,
    label: "Vyprodáno" as const,
  }
}
