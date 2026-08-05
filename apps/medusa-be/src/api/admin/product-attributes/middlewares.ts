import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  AdminCreateProductAttributeDefinitionSchema,
  AdminCreateProductAttributeOptionSchema,
  AdminGetProductAttributeDefinitionsSchema,
  AdminGetProductAttributeOptionProductsSchema,
  AdminGetProductAttributeOptionsSchema,
  AdminSetProductAttributesSchema,
  AdminUpdateProductAttributeDefinitionSchema,
  AdminUpdateProductAttributeOptionSchema,
} from "./validators"

export const adminProductAttributeRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/product-attributes/definitions",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetProductAttributeDefinitionsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/product-attributes/definitions",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminCreateProductAttributeDefinitionSchema),
    ],
  },
  {
    matcher: "/admin/product-attributes/definitions/:id",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminUpdateProductAttributeDefinitionSchema),
    ],
  },
  {
    matcher: "/admin/product-attributes/options",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetProductAttributeOptionsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/product-attributes/definitions/:id/options",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminCreateProductAttributeOptionSchema),
    ],
  },
  {
    matcher: "/admin/product-attributes/options/:id",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminUpdateProductAttributeOptionSchema),
    ],
  },
  {
    matcher: "/admin/product-attributes/options/:id/products",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetProductAttributeOptionProductsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/products/:id/product-attributes",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminSetProductAttributesSchema)],
  },
]
