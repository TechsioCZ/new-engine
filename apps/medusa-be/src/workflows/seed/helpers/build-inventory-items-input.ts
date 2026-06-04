import type {
  CreateInventoryLevelsStepInput,
  CreateProductsStepInput,
} from "../steps"

export function buildInventoryItemsInput(
  products: CreateProductsStepInput
): CreateInventoryLevelsStepInput["inventoryItems"] {
  const inventoryItems: CreateInventoryLevelsStepInput["inventoryItems"] = []

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant.sku) {
        continue
      }

      if (variant.quantities?.locations?.length) {
        inventoryItems.push({
          sku: variant.sku,
          locations: variant.quantities.locations,
        })
        continue
      }

      if (variant.quantities?.quantity !== undefined) {
        inventoryItems.push({
          sku: variant.sku,
          quantity: variant.quantities.quantity,
        })
      }
    }
  }

  return inventoryItems
}
