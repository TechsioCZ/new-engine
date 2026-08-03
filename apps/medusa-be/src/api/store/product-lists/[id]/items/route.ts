import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { definedProperties } from "../../../../../utils/defined-properties"
import { createProductListItemWorkflow } from "../../../../../workflows/product-list/workflows/create-product-list-item"
import {
  toProductListItemResponse,
  withProductListItemSelections,
} from "../../utils"
import {
  type StoreCreateProductListItemSchemaType,
  StoreProductListParamsSchema,
} from "../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateProductListItemSchemaType>,
  res: MedusaResponse
) {
  const { id: listId } = StoreProductListParamsSchema.parse(req.params)
  const { result: item } = await createProductListItemWorkflow(req.scope).run({
    input: definedProperties({
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
      list_id: listId,
    }),
  })
  const [itemWithSelection] = await withProductListItemSelections(req.scope, [
    item,
  ])

  res.status(200).json({
    item: toProductListItemResponse(itemWithSelection ?? item),
  })
}
