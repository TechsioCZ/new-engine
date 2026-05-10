import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { calculateCommercialValuesPreview } from "../../../../../../utils/order-commercial-values"
import {
  fetchEditableCommercialValuesOrder,
  requireCommercialValuesOrderId,
  toCommercialValuesCalculationInput,
} from "../utils"
import type { PostAdminOrderCommercialValuesPreviewSchemaType } from "../validators"

export async function POST(
  req: MedusaRequest<PostAdminOrderCommercialValuesPreviewSchemaType>,
  res: MedusaResponse
) {
  const id = requireCommercialValuesOrderId(req.params.id)
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const order = await fetchEditableCommercialValuesOrder(
    query,
    id,
    req.validatedBody.expected_order_version
  )

  const calculationInput = toCommercialValuesCalculationInput(
    order,
    req.validatedBody
  )
  const preview = calculateCommercialValuesPreview(calculationInput)

  res.json({ preview })
}
