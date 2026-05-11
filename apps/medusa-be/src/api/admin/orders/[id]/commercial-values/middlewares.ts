import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import {
  PostAdminOrderCommercialValuesConfirmSchema,
  PostAdminOrderCommercialValuesPreviewSchema,
} from "./validators"

export const adminOrderCommercialValuesRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/orders/:id/commercial-values/preview",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(PostAdminOrderCommercialValuesPreviewSchema),
    ],
  },
  {
    matcher: "/admin/orders/:id/commercial-values/confirm",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(PostAdminOrderCommercialValuesConfirmSchema),
    ],
  },
]
