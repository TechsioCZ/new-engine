import { authenticate } from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/medusa"

import { storeApprovalsMiddlewares } from "./approvals/middlewares"
import { storeCartsMiddlewares } from "./carts/middlewares"
import { storeCompaniesMiddlewares } from "./companies/middlewares"
import { ensureAuthenticatedCustomerIsActive } from "./customer-account-active"
import { storeCustomersMiddlewares } from "./customers/middlewares"
import { storeQuotesMiddlewares } from "./quotes/middlewares"

export const storeMiddlewares: MiddlewareRoute[] = [
  {
    matcher: /^\/store(?:\/|$)/u,
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
        allowUnregistered: true,
      }),
      ensureAuthenticatedCustomerIsActive,
    ],
  },
  ...storeCartsMiddlewares,
  ...storeCompaniesMiddlewares,
  ...storeCustomersMiddlewares,
  ...storeQuotesMiddlewares,
  ...storeApprovalsMiddlewares,
]
