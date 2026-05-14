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
    methods: ["GET"],
    matcher: "/admin/order-expedition/orders",
    middlewares: [
      validateAndTransformQuery(GetAdminOrderExpeditionOrdersSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/order-expedition/pdf",
    middlewares: [validateAndTransformBody(PostAdminOrderExpeditionPdfSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/order-expedition/status",
    middlewares: [
      validateAndTransformBody(PostAdminOrderExpeditionStatusSchema),
    ],
  },
]
