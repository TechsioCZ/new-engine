import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { AdminPublishableKeyBodySchema } from "./route"

export const adminPublishableKeyRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/provisioning/publishable-key",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminPublishableKeyBodySchema)],
  },
]
