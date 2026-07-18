import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { definedProperties } from "../../../../../utils/defined-properties"
import { addFavoriteProductListItemWorkflow } from "../../../../../workflows/product-list/workflows/add-favorite-product-list-item"
import {
  INLINE_PRODUCT_LIST_ITEMS_LIMIT,
  toProductListItemResponse,
  toProductListResponse,
  withProductListItemSelections,
  withProductListItems,
} from "../../utils"
import type { StoreCreateFavoriteProductListItemSchemaType } from "../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateFavoriteProductListItemSchemaType>,
  res: MedusaResponse
) {
  const { result } = await addFavoriteProductListItemWorkflow(req.scope).run({
    input: definedProperties({
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
    }),
  })
  const [[itemWithSelection], [productListWithItems]] = await Promise.all([
    withProductListItemSelections(req.scope, [result.item]),
    withProductListItems(req.scope, [result.product_list], {
      previewLimit: INLINE_PRODUCT_LIST_ITEMS_LIMIT,
    }),
  ])

  res.status(200).json({
    item: toProductListItemResponse(itemWithSelection ?? result.item),
    product_list: toProductListResponse(
      productListWithItems ?? result.product_list
    ),
  })
}
