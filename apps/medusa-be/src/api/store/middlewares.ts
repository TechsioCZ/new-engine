import type { MiddlewareRoute } from "@medusajs/framework/http"
import { storeApprovalsMiddlewares } from "./approvals/middlewares"
import { storeCartsMiddlewares } from "./carts/middlewares"
import { storeCompaniesMiddlewares } from "./companies/middlewares"
import { storeQuotesMiddlewares } from "./quotes/middlewares"

export const storeMiddlewares: MiddlewareRoute[] = [
  ...storeCartsMiddlewares,
  ...storeCompaniesMiddlewares,
  ...storeQuotesMiddlewares,
  ...storeApprovalsMiddlewares,
]
