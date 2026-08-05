import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminPacketaLabelsSchema } from "./validators"

export const adminPacketaLabelsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/packeta-labels",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminPacketaLabelsSchema)],
  },
]
