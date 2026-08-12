import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import {
  PostAdminPacketaActiveProfileSchema,
  PostAdminPacketaConfigSchema,
} from "./validators"

export const adminPacketaConfigRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/packeta-config",
    middlewares: [validateAndTransformBody(PostAdminPacketaConfigSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/packeta-config/active",
    middlewares: [
      validateAndTransformBody(PostAdminPacketaActiveProfileSchema),
    ],
  },
]
