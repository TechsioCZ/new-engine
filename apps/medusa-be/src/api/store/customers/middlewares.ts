import { validateAndTransformBody } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework"
import { authenticate } from "@medusajs/framework/http"

import {
  StoreConfirmDeactivateCustomerAccountSchema,
  StoreCreateCustomerAccountSchema,
  StoreDeactivateCustomerAccountSchema,
} from "./validators"

const customerAuth = authenticate("customer", ["session", "bearer"])

export const storeCustomersMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/customers",
    methods: ["POST"],
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnregistered: true,
      }),
      validateAndTransformBody(StoreCreateCustomerAccountSchema),
    ],
  },
  {
    matcher: "/store/customers/me/deactivate",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreDeactivateCustomerAccountSchema),
    ],
  },
  {
    matcher: "/store/customers/deactivate/confirm",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(StoreConfirmDeactivateCustomerAccountSchema),
    ],
  },
]
