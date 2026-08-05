import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminOrderEmailSchema } from "./validators"

export const adminOrderEmailRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/orders/:id/email",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminOrderEmailSchema)],
  },
]
