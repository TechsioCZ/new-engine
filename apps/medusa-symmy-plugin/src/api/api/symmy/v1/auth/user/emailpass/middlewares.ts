import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostSymmyAuthUserEmailPassSchema } from "./validators"

export const symmyAuthUserEmailPassRoutes: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/api/symmy/v1/auth/user/emailpass",
    middlewares: [validateAndTransformBody(PostSymmyAuthUserEmailPassSchema)],
  },
]
