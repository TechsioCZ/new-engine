import {
  type MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework"
import { authenticate } from "@medusajs/framework/http"
import {
  StoreConfirmDeactivateCustomerAccountSchema,
  StoreDeactivateCustomerAccountSchema,
  StoreReactivateCustomerAccountSchema,
} from "./validators"

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
  {
    method: ["POST"],
    matcher: "/store/customers/deactivate/confirm",
    middlewares: [
      validateAndTransformBody(StoreConfirmDeactivateCustomerAccountSchema),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/customers/reactivate",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnregistered: true,
      }),
      validateAndTransformBody(StoreReactivateCustomerAccountSchema),
    ],
  },
]
