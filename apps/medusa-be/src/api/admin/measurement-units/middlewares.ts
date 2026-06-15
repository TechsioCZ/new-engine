import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  AdminCreateMeasurementUnitSchema,
  AdminGetMeasurementUnitsSchema,
  AdminSetProductMeasurementSchema,
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
    methods: ["POST"],
    matcher: "/admin/products/:id/measurement",
    middlewares: [validateAndTransformBody(AdminSetProductMeasurementSchema)],
  },
]
