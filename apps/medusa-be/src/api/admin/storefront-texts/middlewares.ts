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
    methods: ["GET"],
    matcher: "/admin/storefront-texts",
    middlewares: [
      validateAndTransformQuery(AdminGetStorefrontTextsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/storefront-texts/catalog",
    middlewares: [
      validateAndTransformQuery(AdminGetStorefrontTextCatalogSchema, {}),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/storefront-texts/catalog",
    middlewares: [
      validateAndTransformBody(AdminImportStorefrontTextCatalogSchema),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/storefront-texts/:id/update",
    middlewares: [validateAndTransformBody(AdminUpdateStorefrontTextSchema)],
  },
]
