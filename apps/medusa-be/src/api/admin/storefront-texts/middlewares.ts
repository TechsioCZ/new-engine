import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  AdminGetStorefrontTextCatalogSchema,
  AdminGetStorefrontTextsSchema,
  AdminImportStorefrontTextCatalogSchema,
  AdminUpdateStorefrontTextSchema,
} from "./validators"

export const adminStorefrontTextRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/storefront-texts",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetStorefrontTextsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/storefront-texts/catalog",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetStorefrontTextCatalogSchema, {}),
    ],
  },
  {
    matcher: "/admin/storefront-texts/catalog",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminImportStorefrontTextCatalogSchema),
    ],
  },
  {
    matcher: "/admin/storefront-texts/:id/update",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminUpdateStorefrontTextSchema)],
  },
]
