import {
  type MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework"
import { authenticate } from "@medusajs/framework/http"
import { StoreDeactivateCustomerAccountSchema } from "./validators"

const customerAuth = authenticate("customer", ["session", "bearer"])

export const storeCustomersMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/customers/me/deactivate",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreDeactivateCustomerAccountSchema),
    ],
  },
]
