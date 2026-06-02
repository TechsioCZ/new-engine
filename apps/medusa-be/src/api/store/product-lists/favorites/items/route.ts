import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { addFavoriteProductListItemWorkflow } from "../../../../../workflows/product-list/workflows/add-favorite-product-list-item"
import { toProductListItemResponse, toProductListResponse } from "../../utils"
import type { StoreCreateFavoriteProductListItemSchemaType } from "../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateFavoriteProductListItemSchemaType>,
  res: MedusaResponse
) {
  const { result } = await addFavoriteProductListItemWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      metadata: req.validatedBody.metadata,
      note: req.validatedBody.note,
      product_id: req.validatedBody.product_id,
      sort_order: req.validatedBody.sort_order,
      variant_id: req.validatedBody.variant_id,
    },
  })

  res.status(200).json({
    item: toProductListItemResponse(result.item),
    product_list: toProductListResponse(result.product_list),
  })
}
