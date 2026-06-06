import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { deleteProductListItemWorkflow } from "../../../../../workflows/product-list/workflows/delete-product-list-item"
import { updateProductListItemWorkflow } from "../../../../../workflows/product-list/workflows/update-product-list-item"
import {
  toProductListItemResponse,
  withProductListItemSelections,
} from "../../utils"
import {
  StoreProductListItemParamsSchema,
  type StoreUpdateProductListItemSchemaType,
} from "../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreUpdateProductListItemSchemaType>,
  res: MedusaResponse
) {
  const { id: itemId } = StoreProductListItemParamsSchema.parse(req.params)
  const { result: item } = await updateProductListItemWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      data: req.validatedBody,
      item_id: itemId,
    },
  })
  const [itemWithSelection] = await withProductListItemSelections(req.scope, [
    item,
  ])

  res.json({ item: toProductListItemResponse(itemWithSelection ?? item) })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id: itemId } = StoreProductListItemParamsSchema.parse(req.params)
  await deleteProductListItemWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      item_id: itemId,
    },
  })

  res.status(200).json({ deleted: true, id: itemId })
}
