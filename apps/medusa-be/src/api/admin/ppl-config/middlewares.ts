import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminPplConfigSchema } from "./validators"

export const adminPplConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/ppl-config",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminPplConfigSchema)],
  },
]
