import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminOrderBusinessStatusSchema } from "./validators"

export const adminOrderBusinessStatusRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/orders/:id/business-status",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminOrderBusinessStatusSchema)],
  },
]
