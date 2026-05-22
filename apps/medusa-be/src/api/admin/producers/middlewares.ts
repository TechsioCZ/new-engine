import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  AdminCreateProducerAttributeTypeSchema,
  AdminCreateProducerSchema,
  AdminGetProducerAttributeTypesSchema,
  AdminGetProducerProductOptionsSchema,
  AdminGetProducersSchema,
  AdminSetProducerProductsSchema,
  AdminSetProductProducersSchema,
  AdminUpdateProducerSchema,
} from "./validators"

export const adminProducerRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/producers/attribute-types",
    middlewares: [
      validateAndTransformQuery(AdminGetProducerAttributeTypesSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/producers/attribute-types/:id",
    middlewares: [
      validateAndTransformQuery(AdminGetProducerAttributeTypesSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/producers/attribute-types",
    middlewares: [
      validateAndTransformBody(AdminCreateProducerAttributeTypeSchema),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/producers",
    middlewares: [
      validateAndTransformQuery(AdminGetProducersSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/producers",
    middlewares: [validateAndTransformBody(AdminCreateProducerSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/producers/:id",
    middlewares: [validateAndTransformBody(AdminUpdateProducerSchema)],
  },
  {
    methods: ["GET"],
    matcher: "/admin/producers/:id/products",
    middlewares: [
      validateAndTransformQuery(AdminGetProducersSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/producers/:id/product-options",
    middlewares: [
      validateAndTransformQuery(AdminGetProducerProductOptionsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/producers/:id/products",
    middlewares: [validateAndTransformBody(AdminSetProducerProductsSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/products/:id/producers",
    middlewares: [validateAndTransformBody(AdminSetProductProducersSchema)],
  },
]
