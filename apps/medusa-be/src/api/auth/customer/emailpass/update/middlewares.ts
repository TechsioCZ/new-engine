import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/medusa"
import { POST } from "./route"

/**
 * Register the closed customer/emailpass update path as an exact static
 * middleware. Medusa orders this before its generic parameterized auth update
 * middleware, preventing the latter from validating and consuming reset JWTs.
 */
export function rejectGenericCustomerEmailpassUpdate(
  request: MedusaRequest,
  response: MedusaResponse
) {
  return POST(request, response)
}

export const customerEmailpassUpdateGuardMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/auth/customer/emailpass/update",
    methods: ["POST"],
    middlewares: [rejectGenericCustomerEmailpassUpdate],
  },
]
