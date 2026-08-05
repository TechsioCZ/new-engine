import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminGLSConfigSchema } from "./validators"

export const adminGLSConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/gls-config",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminGLSConfigSchema)],
  },
]
