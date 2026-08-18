import { validateAndTransformBody } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { AdminUpdateProductContentSchema } from "./validators"

export const adminProductContentRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/products/:id/product-content",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminUpdateProductContentSchema)],
  },
]
