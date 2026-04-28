import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminPacketaConfigSchema } from "./validators"

export const adminPacketaConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/packeta-config",
    middlewares: [validateAndTransformBody(PostAdminPacketaConfigSchema)],
  },
]
