import type { MiddlewareRoute } from "@medusajs/framework/http"
import { adminApprovalsMiddlewares } from "./approvals/middlewares"
import { adminCompaniesMiddlewares } from "./companies/middlewares"
import { adminQuotesMiddlewares } from "./quotes/middlewares"

export const adminMiddlewares: MiddlewareRoute[] = [
  ...adminCompaniesMiddlewares,
  ...adminQuotesMiddlewares,
  ...adminApprovalsMiddlewares,
]
