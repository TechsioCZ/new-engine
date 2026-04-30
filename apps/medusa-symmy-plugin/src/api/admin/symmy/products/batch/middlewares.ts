import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { UpsertProductsBatchSchema } from "./validators"

export const adminProductsBatchRoutes: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/symmy/products/batch",
    middlewares: [validateAndTransformBody(UpsertProductsBatchSchema)],
  },
]
