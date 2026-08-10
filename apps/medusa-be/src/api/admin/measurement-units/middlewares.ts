import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  AdminCreateMeasurementUnitSchema,
  AdminGetMeasurementUnitProductsSchema,
  AdminGetMeasurementUnitsSchema,
  AdminSetProductMeasurementSchema,
  AdminSetProductVariantMeasurementSchema,
  AdminUpdateMeasurementUnitSchema,
} from "./validators"

export const adminMeasurementUnitRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/measurement-units",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetMeasurementUnitsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/measurement-units",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminCreateMeasurementUnitSchema)],
  },
  {
    matcher: "/admin/measurement-units/:id",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminUpdateMeasurementUnitSchema)],
  },
  {
    matcher: "/admin/measurement-units/:id/products",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(AdminGetMeasurementUnitProductsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/admin/products/:id/measurement",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminSetProductMeasurementSchema)],
  },
  {
    matcher: "/admin/products/:id/variants/:variant_id/measurement",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminSetProductVariantMeasurementSchema),
    ],
  },
]
