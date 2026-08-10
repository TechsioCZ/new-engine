import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import { AdminPayloadSsoSchema } from "./route"

export const adminPayloadSsoRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/payload/sso",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminPayloadSsoSchema, { isList: false }),
    ],
  },
]
