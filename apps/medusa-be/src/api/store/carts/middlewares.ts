import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { retrieveCartTransformQueryConfig } from "./query-config"
import { GetCartLineItemsBulkParams, StoreAddLineItemsBulk } from "./validators"

export const storeCartsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/carts/:id/line-items/bulk",
    middlewares: [
      validateAndTransformBody(StoreAddLineItemsBulk),
      validateAndTransformQuery(
        GetCartLineItemsBulkParams,
        retrieveCartTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/carts/:id/approvals",
    middlewares: [authenticate("customer", ["bearer", "session"])],
  },
]
