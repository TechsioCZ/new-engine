import { validateAndTransformQuery } from "@medusajs/framework"
import {
  type MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import {
  GetAdminOrderBusinessStatusesByIdsSchema,
  GetAdminOrderBusinessStatusesSchema,
  PostAdminOrderBusinessStatusesBulkSchema,
} from "./validators"

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
  {
    methods: ["GET"],
    matcher: "/admin/order-business-statuses/by-ids",
    middlewares: [
      validateAndTransformQuery(GetAdminOrderBusinessStatusesByIdsSchema, {
        isList: false,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/order-business-statuses/bulk",
    middlewares: [
      validateAndTransformBody(PostAdminOrderBusinessStatusesBulkSchema),
    ],
  },
]
