import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { applyOrderCommercialValues } from "../../../../../../workflows/order-commercial-values/apply-commercial-values"
import {
  fetchEditableCommercialValuesOrder,
  requireCommercialValuesOrderId,
  toApplyCommercialValuesOrder,
  toCommercialValuesCalculationInput,
} from "../utils"
import type { PostAdminOrderCommercialValuesConfirmSchemaType } from "../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<PostAdminOrderCommercialValuesConfirmSchemaType>,
  res: MedusaResponse
) {
  const id = requireCommercialValuesOrderId(req.params.id)
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const order = await fetchEditableCommercialValuesOrder(
    query,
    id,
    req.validatedBody.expected_order_version
  )

  const result = await applyOrderCommercialValues({
    actor_id: req.auth_context?.actor_id,
    calculation_input: toCommercialValuesCalculationInput(
      order,
      req.validatedBody
    ),
    container: req.scope,
    order: toApplyCommercialValuesOrder(order),
    request: req.validatedBody,
  })

  res.json({ commercial_values: result })
}
