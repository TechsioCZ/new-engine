import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminOrderBusinessStatusSchema } from "./validators"

export const adminOrderBusinessStatusRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/orders/:id/business-status",
    middlewares: [validateAndTransformBody(PostAdminOrderBusinessStatusSchema)],
  },
]
