import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminResendConfigSchema } from "./validators"

export const adminResendConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/resend-config",
    middlewares: [validateAndTransformBody(PostAdminResendConfigSchema)],
  },
]
