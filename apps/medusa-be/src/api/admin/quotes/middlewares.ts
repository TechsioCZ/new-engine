import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/medusa"

import {
  listQuotesTransformQueryConfig,
  retrieveQuoteTransformQueryConfig,
} from "./query-config"
import {
  AdminCreateQuoteMessage,
  AdminGetQuoteParams,
  AdminRejectQuote,
  AdminSendQuote,
} from "./validators"

export const adminQuotesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/quotes",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetQuoteParams,
        listQuotesTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/admin/quotes/:id",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/admin/quotes/:id/send",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminSendQuote),
      validateAndTransformQuery(
        AdminGetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/admin/quotes/:id/reject",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminRejectQuote),
      validateAndTransformQuery(
        AdminGetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
  {
    matcher: "/admin/quotes/:id/messages",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminCreateQuoteMessage),
      validateAndTransformQuery(
        AdminGetQuoteParams,
        retrieveQuoteTransformQueryConfig,
      ),
    ],
  },
]
