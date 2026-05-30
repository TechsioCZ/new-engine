import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { UpdatePriceListPricesBatchSchema } from "./validators"

export const symmyPriceListPricesBatchRoutes: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/api/symmy/v1/price-lists/:code/prices/batch",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformBody(UpdatePriceListPricesBatchSchema),
    ],
  },
]
