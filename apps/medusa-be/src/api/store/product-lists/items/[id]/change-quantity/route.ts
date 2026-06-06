import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { changeProductListItemQuantityWorkflow } from "../../../../../../workflows/product-list/workflows/change-product-list-item-quantity"
import {
  toProductListItemResponse,
  withProductListItemSelections,
} from "../../../utils"
import {
  type StoreChangeProductListItemQuantitySchemaType,
  StoreProductListItemParamsSchema,
} from "../../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreChangeProductListItemQuantitySchemaType>,
  res: MedusaResponse
) {
  const { id: itemId } = StoreProductListItemParamsSchema.parse(req.params)

  const { result: item } = await changeProductListItemQuantityWorkflow(
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
