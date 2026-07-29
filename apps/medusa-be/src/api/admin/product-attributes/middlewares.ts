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
    methods: ["GET"],
    matcher: "/admin/product-attributes/definitions",
    middlewares: [
      validateAndTransformQuery(AdminGetProductAttributeDefinitionsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/product-attributes/definitions",
    middlewares: [
      validateAndTransformBody(AdminCreateProductAttributeDefinitionSchema),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/product-attributes/definitions/:id",
    middlewares: [
      validateAndTransformBody(AdminUpdateProductAttributeDefinitionSchema),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/product-attributes/options",
    middlewares: [
      validateAndTransformQuery(AdminGetProductAttributeOptionsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/product-attributes/definitions/:id/options",
    middlewares: [
      validateAndTransformBody(AdminCreateProductAttributeOptionSchema),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/product-attributes/options/:id",
    middlewares: [
      validateAndTransformBody(AdminUpdateProductAttributeOptionSchema),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/product-attributes/options/:id/products",
    middlewares: [
      validateAndTransformQuery(AdminGetProductAttributeOptionProductsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/products/:id/product-attributes",
    middlewares: [validateAndTransformBody(AdminSetProductAttributesSchema)],
  },
]
