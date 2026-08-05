import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  AdminCreateBrandAttributeTypeSchema,
  AdminCreateBrandSchema,
  AdminGetBrandAttributeTypesSchema,
  AdminGetBrandProductOptionsSchema,
  AdminGetBrandProductsSchema,
  AdminGetBrandsSchema,
  AdminSetProductBrandsSchema,
  AdminUpdateBrandProductsSchema,
  AdminUpdateBrandSchema,
} from "./validators"

export const adminBrandRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/brands/attribute-types",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetBrandAttributeTypesSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/brands/attribute-types/:id",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetBrandAttributeTypesSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/brands/attribute-types",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminCreateBrandAttributeTypeSchema),
    ],
  },
  {
    matcher: "/admin/brands",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetBrandsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/brands",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminCreateBrandSchema)],
  },
  {
    matcher: "/admin/brands/:id",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminUpdateBrandSchema)],
  },
  {
    matcher: "/admin/brands/:id/restore",
    methods: ["POST"],
    middlewares: [],
  },
  {
    matcher: "/admin/brands/:id/products",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetBrandProductsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/brands/:id/product-options",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetBrandProductOptionsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/brands/:id/products",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminUpdateBrandProductsSchema)],
  },
  {
    matcher: "/admin/products/:id/brands",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminSetProductBrandsSchema)],
  },
]
