import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminSymmyWebhookConfigSchema } from "./validators"

export const adminSymmyWebhookRoutes: MiddlewareRoute[] = [
  {
    matcher: "/admin/symmy-webhooks",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminSymmyWebhookConfigSchema)],
  },
]
