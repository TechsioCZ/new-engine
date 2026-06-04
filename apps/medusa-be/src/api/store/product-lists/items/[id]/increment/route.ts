import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { getRouteParam } from "../../../../../../utils/route-params"
import { incrementProductListItemWorkflow } from "../../../../../../workflows/product-list/workflows/increment-product-list-item"
import {
  toProductListItemResponse,
  withProductListItemSelections,
} from "../../../utils"
import type { StoreIncrementProductListItemSchemaType } from "../../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreIncrementProductListItemSchemaType>,
  res: MedusaResponse
) {
  const itemId = getRouteParam(req.params, "id")
  const { result: item } = await incrementProductListItemWorkflow(
    req.scope
  ).run({
    input: {
      customer_id: req.auth_context.actor_id,
      item_id: itemId,
      quantity: req.validatedBody.quantity,
    },
  })

  const [itemWithSelection] = await withProductListItemSelections(req.scope, [
    item,
  ])

  res.status(200).json({
    item: toProductListItemResponse(itemWithSelection ?? item),
  })
}
