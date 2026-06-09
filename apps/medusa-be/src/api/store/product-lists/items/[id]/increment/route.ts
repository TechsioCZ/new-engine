import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { incrementProductListItemWorkflow } from "../../../../../../workflows/product-list/workflows/increment-product-list-item"
import {
  toProductListItemResponse,
  withProductListItemSelections,
} from "../../../utils"
import {
  type StoreIncrementProductListItemQuantitySchemaType,
  StoreProductListItemParamsSchema,
} from "../../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreIncrementProductListItemQuantitySchemaType>,
  res: MedusaResponse
) {
  const { id: itemId } = StoreProductListItemParamsSchema.parse(req.params)

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
