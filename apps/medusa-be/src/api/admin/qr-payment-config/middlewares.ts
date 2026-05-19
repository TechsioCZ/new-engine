import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminQrPaymentConfigSchema } from "./validators"

export const adminQrPaymentConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/qr-payment-config",
    middlewares: [validateAndTransformBody(PostAdminQrPaymentConfigSchema)],
  },
]
