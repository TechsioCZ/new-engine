import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { getRouteParam } from "../../../../../utils/route-params"
import { createProductListItemWorkflow } from "../../../../../workflows/product-list/workflows/create-product-list-item"
import { toProductListItemResponse } from "../../utils"
import type { StoreCreateProductListItemSchemaType } from "../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateProductListItemSchemaType>,
  res: MedusaResponse
) {
  const listId = getRouteParam(req.params, "id")
  const { result: item } = await createProductListItemWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      list_id: listId,
      metadata: req.validatedBody.metadata,
      note: req.validatedBody.note,
      product_id: req.validatedBody.product_id,
      quantity: req.validatedBody.quantity,
      sort_order: req.validatedBody.sort_order,
      variant_id: req.validatedBody.variant_id,
    },
  })

  res.status(200).json({
    item: toProductListItemResponse({
      ...item,
      product_id: req.validatedBody.product_id,
      variant_id: req.validatedBody.variant_id ?? null,
    }),
  })
}
