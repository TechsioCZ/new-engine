import { validateAndTransformQuery } from "@medusajs/framework"
import { validateAndTransformBody } from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  GetAdminOrderBusinessStatusesByIdsSchema,
  GetAdminOrderBusinessStatusesSchema,
  PostAdminOrderBusinessStatusesBulkSchema,
} from "./validators"

export const adminOrderBusinessStatusesRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/order-business-statuses",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(GetAdminOrderBusinessStatusesSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/order-business-statuses/by-ids",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(GetAdminOrderBusinessStatusesByIdsSchema, {
        isList: false,
      }),
    ],
  },
  {
    matcher: "/admin/order-business-statuses/bulk",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(PostAdminOrderBusinessStatusesBulkSchema),
    ],
  },
]
