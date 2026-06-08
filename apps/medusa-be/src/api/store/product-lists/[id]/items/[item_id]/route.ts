import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { deleteProductListItemWorkflow } from "../../../../../../workflows/product-list/workflows/delete-product-list-item"
import { StoreDeleteProductListItemParamsSchema } from "../../../validators"

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id: listId, item_id: itemId } =
    StoreDeleteProductListItemParamsSchema.parse(req.params)

  await deleteProductListItemWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      expected_list_id: listId,
      item_id: itemId,
    },
  })

  res.status(200).json({ deleted: true, id: itemId })
}
