import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { addFavoriteProductListItemWorkflow } from "../../../../../workflows/product-list/workflows/add-favorite-product-list-item"
import {
  toProductListItemResponse,
  toProductListResponse,
  withProductListItems,
} from "../../utils"
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
  const [productListWithItems] = await withProductListItems(req.scope, [
    result.product_list,
  ])

  res.status(200).json({
    item: toProductListItemResponse({
      ...result.item,
      product_id: req.validatedBody.product_id,
      variant_id: req.validatedBody.variant_id ?? null,
    }),
    product_list: toProductListResponse(
      productListWithItems ?? result.product_list
    ),
  })
}
