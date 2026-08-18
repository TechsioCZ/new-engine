import {
  createProductsWorkflow,
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  clearProductLifecycleEvents,
  emitProductLifecycleEvents,
} from "../url-registry-outbox/product-lifecycle-event"

createProductsWorkflow.hooks.productsCreated(
  async ({ products }, context) =>
    await emitProductLifecycleEvents(
      {
        productIds: products.map((product) => product.id),
        reason: "created",
      },
      context
    ),
  clearProductLifecycleEvents
)

updateProductsWorkflow.hooks.productsUpdated(
  async ({ products }, context) =>
    await emitProductLifecycleEvents(
      {
        productIds: products.map((product) => product.id),
        reason: "updated",
      },
      context
    ),
  clearProductLifecycleEvents
)

deleteProductsWorkflow.hooks.productsDeleted(
  async ({ ids }, context) =>
    await emitProductLifecycleEvents(
      { productIds: ids, reason: "deleted" },
      context
    ),
  clearProductLifecycleEvents
)
