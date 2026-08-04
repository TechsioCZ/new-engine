import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminGLSConfigSchema } from "./validators"

export const adminGLSConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/gls-config",
    middlewares: [validateAndTransformBody(PostAdminGLSConfigSchema)],
  },
]
