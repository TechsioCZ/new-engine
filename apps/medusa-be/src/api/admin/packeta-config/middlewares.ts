import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminPacketaConfigSchema } from "./validators"

export const adminPacketaConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/packeta-config",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminPacketaConfigSchema)],
  },
]
