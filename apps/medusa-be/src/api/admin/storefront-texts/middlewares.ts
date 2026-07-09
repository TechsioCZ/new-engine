import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  AdminGetStorefrontTextsSchema,
  AdminUpdateStorefrontTextSchema,
} from "./validators"

export const adminStorefrontTextRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/storefront-texts",
    middlewares: [
      validateAndTransformQuery(AdminGetStorefrontTextsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/storefront-texts/:id/update",
    middlewares: [validateAndTransformBody(AdminUpdateStorefrontTextSchema)],
  },
]
