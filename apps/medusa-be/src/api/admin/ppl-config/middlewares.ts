import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import {
  PostAdminPplActiveProfileSchema,
  PostAdminPplConfigSchema,
} from "./validators"

export const adminPplConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/ppl-config",
    middlewares: [validateAndTransformBody(PostAdminPplConfigSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/ppl-config/active",
    middlewares: [validateAndTransformBody(PostAdminPplActiveProfileSchema)],
  },
]
