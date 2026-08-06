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
import { z } from "@medusajs/framework/zod"
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

  if (
    typeof id !== "string" ||
    id.length === 0 ||
    typeof customerId !== "string" ||
    customerId.length === 0
  ) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "quote",
    fields: ["id", "customer_id"],
    filters: { id },
  })
  const quote = z
    .array(z.object({ customer_id: z.string(), id: z.string() }))
    .parse(data)
    .at(0)

  if (quote === undefined) {
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
    methods: ["ALL"],
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    matcher: "/store/quotes",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(GetQuoteParams, listQuotesTransformQueryConfig),
    ],
  },
  {
    matcher: "/store/quotes",
    methods: ["POST"],
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
    methods: ["GET"],
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
    methods: ["POST"],
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
    methods: ["POST"],
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
    methods: ["GET"],
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
    methods: ["POST"],
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
