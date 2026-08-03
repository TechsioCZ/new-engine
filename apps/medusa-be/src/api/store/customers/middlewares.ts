import {
  type MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework"
import { StoreDeactivateCustomerAccountSchema } from "./validators"

export const storeCustomersMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/customers/me/deactivate",
    middlewares: [
      validateAndTransformBody(StoreDeactivateCustomerAccountSchema),
    ],
  },
]
