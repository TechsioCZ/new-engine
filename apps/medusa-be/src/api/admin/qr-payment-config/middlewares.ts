import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminQrPaymentConfigSchema } from "./validators"

export const adminQrPaymentConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/qr-payment-config",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminQrPaymentConfigSchema)],
  },
]
