import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { UpdateStockBatchSchema } from "./validators"

export const symmyInventoryStockBatchRoutes: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/api/symmy/v1/inventory/stock/batch",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformBody(UpdateStockBatchSchema),
    ],
  },
]
