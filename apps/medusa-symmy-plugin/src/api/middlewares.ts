import { defineMiddlewares } from "@medusajs/medusa"
import { symmyCustomersBatchRoutes } from "./api/symmy/v1/customers/batch/middlewares"
import { symmyInventoryStockBatchRoutes } from "./api/symmy/v1/inventory/stock/batch/middlewares"
import { symmyProductsBatchRoutes } from "./api/symmy/v1/products/batch/middlewares"
import { symmyTrackingBatchRoutes } from "./api/symmy/v1/tracking/batch/middlewares"

export default defineMiddlewares({
  routes: [
    ...symmyProductsBatchRoutes,
    ...symmyInventoryStockBatchRoutes,
    ...symmyCustomersBatchRoutes,
    ...symmyTrackingBatchRoutes,
  ],
})
