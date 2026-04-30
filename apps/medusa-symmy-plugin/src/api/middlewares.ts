import { defineMiddlewares } from "@medusajs/medusa"
import { symmyCustomerGroupsBatchRoutes } from "./api/symmy/v1/customer-groups/batch/middlewares"
import { symmyCustomersBatchRoutes } from "./api/symmy/v1/customers/batch/middlewares"
import { symmyInventoryStockBatchRoutes } from "./api/symmy/v1/inventory/stock/batch/middlewares"
import { symmyInvoicesBatchRoutes } from "./api/symmy/v1/invoices/batch/middlewares"
import { symmyPriceListPricesBatchRoutes } from "./api/symmy/v1/price-lists/[code]/prices/batch/middlewares"
import { symmyPriceListsBatchUpsertRoutes } from "./api/symmy/v1/price-lists/batch-upsert/middlewares"
import { symmyPriceListsRoutes } from "./api/symmy/v1/price-lists/middlewares"
import { symmyProductsBatchRoutes } from "./api/symmy/v1/products/batch/middlewares"
import { symmyTrackingBatchRoutes } from "./api/symmy/v1/tracking/batch/middlewares"

export default defineMiddlewares({
  routes: [
    ...symmyProductsBatchRoutes,
    ...symmyInventoryStockBatchRoutes,
    ...symmyCustomersBatchRoutes,
    ...symmyCustomerGroupsBatchRoutes,
    ...symmyInvoicesBatchRoutes,
    ...symmyPriceListsRoutes,
    ...symmyPriceListsBatchUpsertRoutes,
    ...symmyPriceListPricesBatchRoutes,
    ...symmyTrackingBatchRoutes,
  ],
})
