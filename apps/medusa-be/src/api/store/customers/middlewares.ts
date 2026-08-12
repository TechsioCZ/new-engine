import {
  type MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework"
import { authenticate } from "@medusajs/framework/http"
import {
  StoreConfirmDeactivateCustomerAccountSchema,
  StoreCreateCustomerAccountSchema,
  StoreDeactivateCustomerAccountSchema,
} from "./validators"

const customerAuth = authenticate("customer", ["session", "bearer"])

export const storeCustomersMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/customers",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnregistered: true,
      }),
      validateAndTransformBody(StoreCreateCustomerAccountSchema),
    ],
  },
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
]
