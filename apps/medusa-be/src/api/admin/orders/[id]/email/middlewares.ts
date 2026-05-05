import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminOrderEmailSchema } from "./validators"

export const adminOrderEmailRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/orders/:id/email",
    middlewares: [validateAndTransformBody(PostAdminOrderEmailSchema)],
  },
]
