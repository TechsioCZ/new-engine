import { defineMiddlewares } from "@medusajs/medusa"
import { symmyInventoryStockBatchRoutes } from "./api/symmy/v1/inventory/stock/batch/middlewares"
import { symmyProductsBatchRoutes } from "./api/symmy/v1/products/batch/middlewares"

export default defineMiddlewares({
  routes: [...symmyProductsBatchRoutes, ...symmyInventoryStockBatchRoutes],
})
