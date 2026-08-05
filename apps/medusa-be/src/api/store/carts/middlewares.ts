import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/medusa"

import { retrieveCartTransformQueryConfig } from "./query-config"
import {
  GetCartLineItemsBulkParams,
  StoreAddLineItemsBulk,
  StoreSetCartCustomerNote,
} from "./validators"

export const storeCartsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/carts/:id/line-items/bulk",
    method: ["POST"],
    middlewares: [
      validateAndTransformBody(StoreAddLineItemsBulk),
      validateAndTransformQuery(
        GetCartLineItemsBulkParams,
        retrieveCartTransformQueryConfig
      ),
    ],
  },
  {
    matcher: "/store/carts/:id/customer-note",
    method: ["POST"],
    middlewares: [
      authenticate("customer", ["bearer", "session"]),
      validateAndTransformBody(StoreSetCartCustomerNote),
    ],
  },
  {
    matcher: "/store/carts/:id/approvals",
    method: ["POST"],
    middlewares: [authenticate("customer", ["bearer", "session"])],
  },
]
