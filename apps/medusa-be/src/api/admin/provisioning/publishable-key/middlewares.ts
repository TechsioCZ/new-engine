import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { AdminPublishableKeyBodySchema } from "./route"

export const adminPublishableKeyRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/provisioning/publishable-key",
    middlewares: [validateAndTransformBody(AdminPublishableKeyBodySchema)],
  },
]
