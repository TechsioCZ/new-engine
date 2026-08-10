import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminGLSLabelsSchema } from "./validators"

export const adminGLSLabelsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/gls-labels",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminGLSLabelsSchema)],
  },
]
