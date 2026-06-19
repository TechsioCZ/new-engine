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
    methods: ["GET"],
    matcher: "/admin/measurement-units",
    middlewares: [
      validateAndTransformQuery(AdminGetMeasurementUnitsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/measurement-units",
    middlewares: [validateAndTransformBody(AdminCreateMeasurementUnitSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/measurement-units/:id",
    middlewares: [validateAndTransformBody(AdminUpdateMeasurementUnitSchema)],
  },
  {
    methods: ["GET"],
    matcher: "/admin/measurement-units/:id/products",
    middlewares: [
      validateAndTransformQuery(AdminGetMeasurementUnitProductsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/products/:id/measurement",
    middlewares: [validateAndTransformBody(AdminSetProductMeasurementSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/products/:id/variants/:variant_id/measurement",
    middlewares: [
      validateAndTransformBody(AdminSetProductVariantMeasurementSchema),
    ],
  },
]
