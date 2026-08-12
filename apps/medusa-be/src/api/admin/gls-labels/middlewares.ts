import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminGLSLabelsSchema } from "./validators"

export const adminGLSLabelsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/gls-labels",
    middlewares: [validateAndTransformBody(PostAdminGLSLabelsSchema)],
  },
]
