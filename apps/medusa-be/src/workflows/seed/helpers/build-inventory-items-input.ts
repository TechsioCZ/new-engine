import type {
  CreateInventoryLevelsStepInput,
  CreateProductsStepInput,
} from "../steps"

export function buildInventoryItemsInput(
  products: CreateProductsStepInput,
): CreateInventoryLevelsStepInput["inventoryItems"] {
  const inventoryItems: CreateInventoryLevelsStepInput["inventoryItems"] = []

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant.sku) {
        continue
      }

      if (variant.quantities?.locations?.length) {
        inventoryItems.push({
          locations: variant.quantities.locations,
          sku: variant.sku,
        })
        continue
      }

      if (variant.quantities?.quantity !== undefined) {
        inventoryItems.push({
          quantity: variant.quantities.quantity,
          sku: variant.sku,
        })
      }
    }
  }

  return inventoryItems
}
