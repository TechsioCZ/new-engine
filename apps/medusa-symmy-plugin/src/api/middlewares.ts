import { defineMiddlewares, errorHandler } from "@medusajs/framework/http"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { adminSymmyWebhookRoutes } from "./admin/symmy-webhooks/middlewares"
import { symmyAdminRoutes } from "./api/symmy/v1/admin/middlewares"
import { symmyAuthUserEmailPassRoutes } from "./api/symmy/v1/auth/user/emailpass/middlewares"
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
      case MedusaError.Types.INVALID_DATA: {
        return 400
      }
      case MedusaError.Types.UNAUTHORIZED: {
        return 401
      }
      case MedusaError.Types.NOT_FOUND: {
        return 404
      }
      default: {
        return 500
      }
    }
  }

  if (typeof error !== "object" || error === null) {
    return 500
  }

  const status =
    ("status" in error ? error.status : undefined) ??
    ("statusCode" in error ? error.statusCode : undefined)

  return typeof status === "number" ? status : 500
}

const describeSymmyError = (error: unknown) =>
  error instanceof Error ? error.message : "An unexpected error occurred"

const getSymmyError = (error: unknown) => {
  const status = getErrorStatus(error)
  const message = describeSymmyError(error)

  if (status === 400) {
    return {
      code: "VALIDATION_ERROR",
      details: { message },
      message: "Invalid request parameters",
      status,
    }
  }

  if (status === 401 || status === 403) {
    return {
      code: "UNAUTHORIZED",
      message: "Missing or invalid authentication token",
      status: 401,
    }
  }

  if (status === 404) {
    return {
      code: "NOT_FOUND",
      details: { message },
      message: "Resource not found",
      status,
    }
  }

  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    status: 500,
  }
}

export default defineMiddlewares({
  errorHandler: (
    error: unknown,
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction,
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
    ...symmyAdminRoutes,
    ...symmyAuthUserEmailPassRoutes,
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
