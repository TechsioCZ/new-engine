import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"

import { PostAdminPplConfigSchema } from "./validators"

export const adminPplConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/ppl-config",
    middlewares: [validateAndTransformBody(PostAdminPplConfigSchema)],
  },
]
