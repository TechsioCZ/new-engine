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
  AdminGetBrandsSchema,
  AdminSetBrandProductsSchema,
  AdminSetProductBrandsSchema,
  AdminUpdateBrandSchema,
} from "./validators"

export const adminBrandRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/brands/attribute-types",
    middlewares: [
      validateAndTransformQuery(AdminGetBrandAttributeTypesSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/brands/attribute-types/:id",
    middlewares: [
      validateAndTransformQuery(AdminGetBrandAttributeTypesSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/brands/attribute-types",
    middlewares: [
      validateAndTransformBody(AdminCreateBrandAttributeTypeSchema),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/brands",
    middlewares: [
      validateAndTransformQuery(AdminGetBrandsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/brands",
    middlewares: [validateAndTransformBody(AdminCreateBrandSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/brands/:id",
    middlewares: [validateAndTransformBody(AdminUpdateBrandSchema)],
  },
  {
    methods: ["GET"],
    matcher: "/admin/brands/:id/products",
    middlewares: [
      validateAndTransformQuery(AdminGetBrandsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/brands/:id/product-options",
    middlewares: [
      validateAndTransformQuery(AdminGetBrandProductOptionsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/brands/:id/products",
    middlewares: [validateAndTransformBody(AdminSetBrandProductsSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/products/:id/brands",
    middlewares: [validateAndTransformBody(AdminSetProductBrandsSchema)],
  },
]
