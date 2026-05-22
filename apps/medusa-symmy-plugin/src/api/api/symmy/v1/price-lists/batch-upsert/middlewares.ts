import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { UpsertPriceListsBatchSchema } from "./validators"

export const symmyPriceListsBatchUpsertRoutes: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/api/symmy/v1/price-lists/batch-upsert",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformBody(UpsertPriceListsBatchSchema),
    ],
  },
]
