import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminSymmyWebhookConfigSchema } from "./validators"

export const adminSymmyWebhookRoutes: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/symmy-webhooks",
    middlewares: [
      validateAndTransformBody(PostAdminSymmyWebhookConfigSchema),
    ],
  },
]
