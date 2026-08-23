import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/medusa"
import { bindCartLocaleFromRequest } from "./cart-locale"
import { retrieveCartTransformQueryConfig } from "./query-config"
import {
  GetCartLineItemsBulkParams,
  StoreAddLineItemsBulk,
  StoreSetCartCustomerNote,
} from "./validators"

export const storeCartsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/carts",
    middlewares: [bindCartLocaleFromRequest],
  },
  {
    method: ["POST"],
    matcher: "/store/carts/:id",
    middlewares: [bindCartLocaleFromRequest],
  },
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
    matcher: "/store/carts/:id/customer-note",
    middlewares: [
      authenticate("customer", ["bearer", "session"]),
      validateAndTransformBody(StoreSetCartCustomerNote),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/carts/:id/approvals",
    middlewares: [authenticate("customer", ["bearer", "session"])],
  },
]
