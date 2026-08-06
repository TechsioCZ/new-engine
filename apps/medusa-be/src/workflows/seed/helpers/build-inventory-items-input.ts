import type {
  CreateInventoryLevelsStepInput,
  CreateProductsStepInput,
} from "../steps"

export const buildInventoryItemsInput = (
  products: CreateProductsStepInput,
): CreateInventoryLevelsStepInput["inventoryItems"] => {
  const inventoryItems: CreateInventoryLevelsStepInput["inventoryItems"] = []

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (variant.sku !== undefined && variant.sku.length > 0) {
        const locations = variant.quantities?.locations
        if (locations !== undefined && locations.length > 0) {
          inventoryItems.push({
            locations,
            sku: variant.sku,
          })
        } else if (variant.quantities?.quantity !== undefined) {
          inventoryItems.push({
            quantity: variant.quantities.quantity,
            sku: variant.sku,
          })
        }
      }
    }
  }

  return inventoryItems
}
