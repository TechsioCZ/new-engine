import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MiddlewareRoute } from "@medusajs/medusa"

import {
  listQuotesTransformQueryConfig,
  retrieveQuoteTransformQueryConfig,
} from "./query-config"
import {
  AcceptQuote,
  CreateQuote,
  GetQuoteParams,
  RejectQuote,
  StoreCreateQuoteMessage,
} from "./validators"

export const ensureQuoteCustomer = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) => {
  const { id } = req.params
  const customerId = req.auth_context.actor_id

  if (!(id && customerId)) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [quote],
  } = await query.graph({
    entity: "quote",
    fields: ["id", "customer_id"],
    filters: { id },
  })

  if (!quote) {
    res.status(404).json({ message: "Quote not found" })
    return
  }

  if (quote.customer_id !== customerId) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  next()
}

export const storeQuotesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/quotes*",
    method: "ALL",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    matcher: "/store/quotes",
    method: ["GET"],
    middlewares: [
      validateAndTransformQuery(GetQuoteParams, listQuotesTransformQueryConfig),
    ],
  },
  {
    matcher: "/store/quotes",
    method: ["POST"],
    middlewares: [
      validateAndTransformBody(CreateQuote),
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/store/quotes/:id",
    method: ["GET"],
    middlewares: [
      ensureQuoteCustomer,
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/store/quotes/:id/accept",
    method: ["POST"],
    middlewares: [
      ensureQuoteCustomer,
      validateAndTransformBody(AcceptQuote),
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/store/quotes/:id/reject",
    method: ["POST"],
    middlewares: [
      ensureQuoteCustomer,
      validateAndTransformBody(RejectQuote),
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/store/quotes/:id/preview",
    method: ["GET"],
    middlewares: [
      ensureQuoteCustomer,
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/store/quotes/:id/messages",
    method: ["POST"],
    middlewares: [
      ensureQuoteCustomer,
      validateAndTransformBody(StoreCreateQuoteMessage),
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
]
