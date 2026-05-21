import {
  defineMiddlewares,
  errorHandler,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { adminSymmyWebhookRoutes } from "./admin/symmy-webhooks/middlewares"
import { symmyCustomerGroupCustomersBatchRoutes } from "./api/symmy/v1/customer-groups/[code]/customers/batch/middlewares"
import { symmyCustomerGroupsBatchRoutes } from "./api/symmy/v1/customer-groups/batch/middlewares"
import { symmyCustomersBatchRoutes } from "./api/symmy/v1/customers/batch/middlewares"
import { symmyInventoryStockBatchRoutes } from "./api/symmy/v1/inventory/stock/batch/middlewares"
import { symmyInvoicesBatchRoutes } from "./api/symmy/v1/invoices/batch/middlewares"
import { symmyJobRoutes } from "./api/symmy/v1/jobs/middlewares"
import { symmyPriceListPricesBatchRoutes } from "./api/symmy/v1/price-lists/[code]/prices/batch/middlewares"
import { symmyPriceListsBatchUpsertRoutes } from "./api/symmy/v1/price-lists/batch-upsert/middlewares"
import { symmyPriceListsRoutes } from "./api/symmy/v1/price-lists/middlewares"
import { symmyProductsBatchRoutes } from "./api/symmy/v1/products/batch/middlewares"
import { symmyTrackingBatchRoutes } from "./api/symmy/v1/tracking/batch/middlewares"

const defaultErrorHandler = errorHandler()

const isSymmyRoute = (req: MedusaRequest) => req.path.startsWith("/api/symmy/")

const getErrorStatus = (error: unknown) => {
  if (error instanceof MedusaError) {
    switch (error.type) {
      case MedusaError.Types.INVALID_DATA:
        return 400
      case MedusaError.Types.UNAUTHORIZED:
        return 401
      case MedusaError.Types.NOT_FOUND:
        return 404
      default:
        return 500
    }
  }

  if (!error || typeof error !== "object") {
    return 500
  }

  const record = error as Record<string, unknown>
  const status = record.status ?? record.statusCode

  return typeof status === "number" ? status : 500
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "An unexpected error occurred"

const getSymmyError = (error: unknown) => {
  const status = getErrorStatus(error)
  const message = getErrorMessage(error)

  if (status === 400) {
    return {
      status,
      code: "VALIDATION_ERROR",
      message: "Invalid request parameters",
      details: { message },
    }
  }

  if (status === 401 || status === 403) {
    return {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Missing or invalid authentication token",
    }
  }

  if (status === 404) {
    return {
      status,
      code: "NOT_FOUND",
      message: "Resource not found",
      details: { message },
    }
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  }
}

export default defineMiddlewares({
  errorHandler: (
    error: unknown,
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    if (!isSymmyRoute(req)) {
      defaultErrorHandler(error, req, res, next)
      return
    }

    const symmyError = getSymmyError(error)

    res.status(symmyError.status).json({
      error: {
        code: symmyError.code,
        message: symmyError.message,
        ...("details" in symmyError ? { details: symmyError.details } : {}),
      },
    })
  },
  routes: [
    ...adminSymmyWebhookRoutes,
    ...symmyJobRoutes,
    ...symmyProductsBatchRoutes,
    ...symmyInventoryStockBatchRoutes,
    ...symmyCustomersBatchRoutes,
    ...symmyCustomerGroupsBatchRoutes,
    ...symmyCustomerGroupCustomersBatchRoutes,
    ...symmyInvoicesBatchRoutes,
    ...symmyPriceListsRoutes,
    ...symmyPriceListsBatchUpsertRoutes,
    ...symmyPriceListPricesBatchRoutes,
    ...symmyTrackingBatchRoutes,
  ],
})
