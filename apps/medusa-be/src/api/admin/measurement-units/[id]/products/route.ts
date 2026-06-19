import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  listMeasurementUnitAssignedProducts,
  retrieveMeasurementUnitOrThrow,
} from "../../utils"
import type { AdminGetMeasurementUnitProductsSchemaType } from "../../validators"

export async function GET(
  req: MedusaRequest<unknown, AdminGetMeasurementUnitProductsSchemaType>,
  res: MedusaResponse
) {
  const unitId = req.params.id ?? ""

  await retrieveMeasurementUnitOrThrow(req.scope, unitId, { withDeleted: true })

  const { products, count } = await listMeasurementUnitAssignedProducts({
    limit: req.validatedQuery.limit,
    offset: req.validatedQuery.offset,
    orderBy: req.validatedQuery.order_by ?? req.validatedQuery.order,
    q: req.validatedQuery.q,
    scope: req.scope,
    status: req.validatedQuery.status,
    unitId,
  })

  res.status(200).json({
    count,
    limit: req.validatedQuery.limit,
    offset: req.validatedQuery.offset,
    products,
  })
}
