import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  listProductAttributeOptionAssignedProducts,
  retrieveProductAttributeOptionOrThrow,
} from "../../../utils"
import type { AdminGetProductAttributeOptionProductsSchemaType } from "../../../validators"

export async function GET(
  req: AuthenticatedMedusaRequest<
    unknown,
    AdminGetProductAttributeOptionProductsSchemaType
  >,
  res: MedusaResponse
) {
  const optionId = req.params.id ?? ""
  await retrieveProductAttributeOptionOrThrow(req.scope, optionId)

  const { count, products } = await listProductAttributeOptionAssignedProducts({
    limit: req.validatedQuery.limit,
    offset: req.validatedQuery.offset,
    optionId,
    order: req.validatedQuery.order,
    q: req.validatedQuery.q,
    scope: req.scope,
  })

  res.json({
    count,
    limit: req.validatedQuery.limit,
    offset: req.validatedQuery.offset,
    products,
  })
}
