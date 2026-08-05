import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import {
  GetAdminOrderExpeditionOrdersSchema,
  PostAdminOrderExpeditionPdfSchema,
  PostAdminOrderExpeditionStatusSchema,
} from "./validators"

export const adminOrderExpeditionRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/order-expedition/orders",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(GetAdminOrderExpeditionOrdersSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/order-expedition/pdf",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminOrderExpeditionPdfSchema)],
  },
  {
    matcher: "/admin/order-expedition/status",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(PostAdminOrderExpeditionStatusSchema),
    ],
  },
]
