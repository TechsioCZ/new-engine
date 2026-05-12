import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { GetAdminOrderBusinessStatusesSchema } from "./validators"

export const adminOrderBusinessStatusesRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/order-business-statuses",
    middlewares: [
      validateAndTransformQuery(GetAdminOrderBusinessStatusesSchema, {
        isList: true,
      }),
    ],
  },
]
