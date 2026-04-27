import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { AdminPayloadSsoSchema } from "./route"

export const adminPayloadSsoRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/payload/sso",
    middlewares: [validateAndTransformQuery(AdminPayloadSsoSchema, { isList: false })],
  },
]
