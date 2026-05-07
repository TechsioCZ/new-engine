import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminPacketaLabelsSchema } from "./validators"

export const adminPacketaLabelsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/packeta-labels",
    middlewares: [validateAndTransformBody(PostAdminPacketaLabelsSchema)],
  },
]
